var _path = require('path');

//$load
var tovue = {};

var str_cutting = function(str,aa = '<\\?',bb = '\\?>'){
	var ma = new RegExp(aa+'((?:.|\r?\n)+?)'+bb,"g");
	var result;
	var r = [];
	var index = 0;
	while((result = ma.exec(str)) !== null){
		r.push([str.substr(index,result.index - index),result[1]]);
		index = ma.lastIndex;
	}
	r.push([str.substr(index),'']);
	return r;
}

function js_enter(str){
	var a = ['\\','\'',"\r\n","\r","\n"];
	var b = ['\\\\','\\\'','\\r\\n','\\r','\\n'];
	for(var i in a){
		str = str_replace(a[i],b[i],str);
	}
	return str;
}

function dec62(n) {
	var base = 62;
	var index = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
	var ret = '',a;
	for(var t = Math.floor(Math.log10(n) / Math.log10(base)); t >= 0; t --) {
		a = Math.floor(n / Math.pow(base, t));
		ret += index.substr(a, 1);
		n -= a * Math.pow(base, t);
	}
	return ret;
}

function set_path(ite,str){
	for(var i in ite.path){
		str = str_replace(i,ite.path[i],str);
	}
	return str;
}

async function op_html(conf,op,ite){
	op = op.trim();
	if(op.length === 0)return '';
	if(op[0] === '#')return '';
	var op2 = preg_split(op,'\\s+',2);

	var a = op2[0].toLowerCase();
	var b = op2.length === 2?op2[1]:'';

	switch(a){
		case 'app':
			b = b.trim();
			if(b.length){
				var info = (await F('./t.js'))+
				'$load.root = \''+ite.path.__ROOT__+'\';'+
				(conf.config.ws?('$load.host = \''+conf.config.ws.host+'\';'+
				'$load.port = \''+conf.config.ws.port+'\';'):'')+
				'document.write(\''+js_enter(set_path(ite,b))+'\')';
				var finfo = _path.join(conf.dist,ite.base+'.js');
				await F(finfo,info);
				return '<script src="'+ite.path.__ROOT__+'/'+ite.base+'.js?v='+dec62(time())+'"></script>';
			}
		break;
		case 'dist':
			ite.dist = b.trim()
		break;
	}
	return '';
}

function op_js(op){
	op = op.trim();
	if(op.length === 0)return '';
	if(op[0] === '#')return '';
	var op2 = preg_split(op,'\\s+',2);

	var a = op2[0].toLowerCase();
	var b = op2.length === 2?op2[1]:'';

	switch(a){
		case 'js':
			return b + "\n";
		break;
		//if操作
		case 'if':
			return 'if('+b+'){';
		break;
		case 'else':
			return '}else{';
		break;
		case 'elseif':
			return '}else if('+b+'){';
		break;
		case '/if':
			return '}';
		break;

		//switch操作
		case 'switch':
			return 'switch('+b+'){default:';
		break;
		case '/switch':
			return '}';
		break;
		case 'case':
			return 'break;case \''+b+'\':';
		break;

		//for操作
		case 'for':
			return 'for('+b+'){';
		break;
		case '/for':
			return '}';
		break;
	}
	return '';
}

function compile_tpl(str){
	var op = preg_split(str,'\\s+',2);
	if(op.length === 1)op.push('');
	var d = str_cutting(op[1],'<%','%>');

	var r = '';
	for(var v of d){
		r += 'r+=\''+js_enter(v[0])+'\';'+op_js(v[1]);
	}

	var ks = op[0].split('.');
	var str = '',t = 'this';
	for(var i = 0;i < ks.length-1;++i){
		t += '[\''+ks[i]+'\']';
		str += 'if(!'+t+')'+t+'={};';
	}
	t += '[\''+ks[i]+'\']';

	return str+t+'=function(){var f = function(){var r=\'\';'+r+'return r};return function(d){return f.call(d)};}()';
}

async function op_tpl(conf,op,ite){
	op = op.trim();
	if(op.length === 0)return '';
	if(op[0] === '#')return '';
	var op2 = preg_split(op,'\\s+',2);

	var a = op2[0].toLowerCase();
	var b = op2.length === 2?op2[1]:'';

	switch(a){
		case 'less':
			ite.less.push(b.trim());
		break;
		case 'tpl':
			ite.es.push(compile_tpl(b.trim()));
		break;
		case 'script':
			b = b.trim();
			ite.script = ite.script.concat((new Function('return '+set_path(ite,b.trim()))).call());
		break;
		case 'es':
			ite.es.push(b.trim());
		break;
	}
	return '';
}

async function tohtml(conf,str,filename){
	var path = _path.join(conf.base,filename)
	var base = str_replace('\\','/',filename.substr(0,filename.length-5))
	var ite = {
		str:str,
		base:base,
		path:conf.path(base)
	};

	var body = '';

	var d = str_cutting(ite.str);
	for(var v of d){
		body += v[0] + (await op_html(conf,v[1],ite));
	}

	await F(ite.dist||_path.join(conf.dist,filename),set_path(ite,body.trim()));

	_('html:\t'+path);

	return [0];
}

async function totpl(conf,str,filename,filename2){
	var path = _path.join(conf.base,filename)
	var path2 = _path.join(conf.base,filename2)
	var topath = _path.join(conf.dist,filename);
	if(await filemtime(path2) <= await filemtime(topath)){return [];}

	var base = str_replace('\\','/',filename.substr(0,filename.length-4))
	var ite = {
		str:str,
		base:base,
		es:[],
		less:[],
		script:[],
		path:conf.path(base)
	};

	var body = '';

	var d = str_cutting(ite.str);
	for(var v of d){
		body += v[0] + (await op_tpl(conf,v[1],ite));
	}

	d = str_cutting(body,'<\\s*style.*?>','<\\s*/\\s*style\\s*>');
	body = '';
	for(var v of d){
		body += v[0];
		var _str = v[1].trim();
		if(_str)ite.less.push(_str);
	}

	d = str_cutting(body,'<\\s*script.*?>','<\\s*/\\s*script\\s*>');
	body = '';
	for(var v of d){
		body += v[0];
		var _str = v[1].trim();
		if(_str)ite.es.push(_str);
	}

	var lessfile = _path.join(conf.base,base+'.less');
	if(await is_file(lessfile)){
		ite.less.push(await F(lessfile));
	}

	var esfile = _path.join(conf.base,base+'.es');
	if(await is_file(esfile)){
		ite.es.push(await F(esfile));
	}

	for(var i in ite.less){
		var [code,data] = await conf.toless(set_path(ite,ite.less[i]),path);

		if(code !== 0){
			conf.ws.send({type:'less',state:false,file:path2,line:data});
			_('less 编译出错:',path2,data);
	
			return [];
		}

		ite.less[i] = data;
	}

	var json = {};
	json.template = set_path(ite,body.trim());
	json.style = ite.less||[];
	if(ite.script.length)json.script = ite.script;

	var fn = 'window.$load[\''+base+'\']('+json_encode(json)+',function(){'+set_path(ite,ite.es.join('\n'))+'})';

	var [code,data] = await conf.toes(fn);

	if(code !== 0){
		var err = data.toString();
		var pos = err.indexOf('\n\n')
		var str = err.substr(0,pos);
		conf.ws.send({type:'es',state:false,file:path2,error:str});
		_('es 编译出错:',path2,err);

		return [];
	}

	await F(topath,data);

	_('tpl:\t'+path2);

	return [0];
}

tovue.html = async function(conf,filename,fn){
	var path = _path.join(conf.base,filename);
	if(!await is_file(path)){fn();return;}
	var str = await F(path).catch(err=>{fn()});
	var [code,data] = await tohtml(conf,str,filename);
	if(code === 0){
		conf.ws.send({type:'html',state:true,file:path});
	}
	fn()
};

tovue.tpl = async function(conf,filename,fn,filename2){
	var path = _path.join(conf.base,filename);
	if(!await is_file(path)){fn();return;}
	if(!await is_file(_path.join(conf.base,filename2))){fn();return;}
	var str = await F(path).catch(fn);
	var [code,data] = await totpl(conf,str,filename,filename2);
	if(code === 0){
		conf.ws.send({type:'tpl',state:true,file:path});
	}
	fn()
};

module.exports = tovue;