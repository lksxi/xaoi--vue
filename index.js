var xaoi = require('./xaoi');

var config = require('./config');

var fs = require('fs');
var _less = require('less');
var babel = require("@babel/core");
var _path = require('path');

var ws = function(){
	var r = {};

	if(config.ws){
		var http = require('http');
		var websocket = require('ws');

		var server = http.createServer();
		server.listen(config.ws.port,config.ws.host);

		const wss = new websocket.Server({ server });

		wss.on('connection', function connection(ws,req){
			
		});

		server.on('listening', function() {
			config.ws.port = server.address().port;
		})

		r.send = function(msg){
			var str = JSON.stringify(['compile',msg]);
			for(var v of wss.clients){
				v.send(str);
			}
		}
	}else{
		r.send = function(){

		}
	}

	return r;
}();

var tovue = require('./tovue');

var xaoi_tpl = async function(conf){

	if(typeof conf === 'string'){
		conf = {
			is_tpl:false,
			base:_path.resolve(conf),
			dist:_path.resolve(conf)
		}
	}else{
		conf.is_tpl = true;
		conf.base	= _path.resolve(conf.base)
		conf.dist	= _path.resolve(conf.dist),
		conf.config	= config
	}

	var _tpl = function(){
		var r = {};

		var toless = function(str,file){
			return new Promise(ok=>{
				_less.render(str,{paths: [_path.dirname(file)],compress:config.css.compress},(err,output)=>{
					if(err){
						ok([1,err.line]);
					}else{
						ok([0,output.css]);
					}
				})
			});
		}

		var less = async function(filename,fn){
			var path = _path.join(conf.base,filename);
			var topath = _path.join(conf.dist,filename.substr(0,filename.length-5)+'.css');
			if(await filemtime(path) <= await filemtime(topath)){fn();return;}
			if(!await is_file(path)){fn();return;}
			var str = await F(path).catch(fn);
			var [code,data] = await toless(str,path);
			if(code === 0){
				ws.send({type:'less',state:true,file:path});
				await F(topath, data);
				_('less:\t'+path);
			}else{
				ws.send({type:'less',state:false,file:path,line:data});
				_('less 编译出错:',path,data);
			}
			fn()
		}

		var toes = function(){
			var babel_conf = {
				"presets": ["@babel/preset-env"],
				"plugins": [
				[
				  "@babel/plugin-transform-runtime",
				  {
					"absoluteRuntime": false,
					"corejs": false,
					"helpers": false,
					"regenerator": true
				  }
				]
			  ]
			};
			return function(str){
				return new Promise(ok=>{
					babel.transform(str,babel_conf,(err,output)=>{
						if(err){
							ok([1,err]);
						}else{
							ok([0,output.code]);
						}
					})
				});
			}
		}();

		var es = async function(filename,fn){
			var path = _path.join(conf.base,filename);
			var topath = _path.join(conf.dist,filename.substr(0,filename.length-3)+'.js');
			if(await filemtime(path) <= await filemtime(topath)){fn();return;}
			if(!await is_file(path)){fn();return;}
			var str = await F(path).catch(fn);
			var [code,data] = await toes(str);
			if(code === 0){
				ws.send({type:'es',state:true,file:path});
				await F(topath, data);
				_('es:\t'+path);
			}else{
				var err = data.toString();
				var pos = err.indexOf('\n\n')
				var str = err.substr(0,pos);
				ws.send({type:'es',state:false,file:path,error:str});
				_('es 编译出错:',path,err);
			}
			fn()
		}

		conf.toless = toless;
		conf.toes = toes;
		conf.ws = ws;

		r.compile = function(filename,fn){
			if(!filename){
				fn();
				return;
			}
			var pos = filename.lastIndexOf('.');
			if(pos === -1){
				fn();
				return;
			}
			var ext = filename.substr(pos);
			if(conf.is_tpl){
				switch(ext){
					case '.html':
						tovue.html(conf,filename,fn);
					break;
					case '.tpl':
						tovue.tpl(conf,filename,fn,filename);
					break;
					case '.less':
						tovue.tpl(conf,filename.substr(0,filename.length-5)+'.tpl',fn,filename);
					break;
					case '.es':
						tovue.tpl(conf,filename.substr(0,filename.length-3)+'.tpl',fn,filename);
					break;
					default:
						fn();
					break;
				}
			}else{
				switch(ext){
					case '.less':
						less(filename,fn);
					break;
					case '.es':
						es(filename,fn);
					break;
					default:
						fn();
					break;
				}
			}
		}

		return r;
	}();

	var queue = function(){
		var r = {};

		var is_ok = true;
		var lis = [];

		r.add = function(filename){
			if(lis.indexOf(filename) === -1)lis.push(filename)
			if(is_ok){
				is_ok = false;
				var f = function(){
					var filename = lis.shift()
					if(filename){
						_tpl.compile(filename,f);
					}else{
						is_ok = true;
					}
				}
				_tpl.compile(lis.shift(),f);
			}
		};

		return r;
	}();

	if(await is_file(conf.base)){

		var join = require('path').join;

		var len = conf.base.length+1;

		async function findJsonFile(path) {
			let files = fs.readdirSync(path);
			for(var item of files){
				let fPath = join(path, item);
				let stat = fs.statSync(fPath);
				if (stat.isDirectory() === true) {
					await findJsonFile(fPath);
				}
				if (stat.isFile() === true) {
					await new Promise(ok=>{
						_tpl.compile(fPath.substr(len),ok)
					})
				}
			}
		}
		await findJsonFile(conf.base);

		_('watch');

		fs.watch(conf.base,{recursive:true},(event, filename)=>{
			switch(event){
				case 'change':
					setTimeout(()=>{
						queue.add(filename)
					},100);
				break;
			}
		})

	}else{
		_('目录不存在：'+conf.base)
	}
};

for(var v of config.dir){
	xaoi_tpl(v);
}

_('start')