_ = console.log;

F = function(){
	var fs = require("fs");
	return function(){
		var args = arguments;
		switch(args.length){
			case 1:
				return new Promise(function(resolve, reject) {
					fs.readFile(args[0],function(err,data){
						if(err){
							reject(err);
						}else{
							resolve(data.toString());
						}
					});
				});
			break;
			case 2:
				return new Promise(function(resolve, reject) {
					var dir = dirname(args[0]);
					var f = function(){
						fs.writeFile(args[0],args[1],function(err,data){
							if(err){
								reject(err);
							}else{
								resolve(data);
							}
						});
					};
					is_file(dir).then(ok=>{
						if(ok){
							f();
						}else{
							mkdir(dir,f);
						}
					})
				});
			break;
		}
	};
}();

json_encode = function(o){return JSON.stringify(o)};
json_decode = function(s){return JSON.parse(s)};

is_array = function(d){
	return Object.prototype.toString.call(d) === '[object Array]';
}

implode = function(op,d){
	var str = [];
	for(var i in d){
		str.push(d[i]);
	}
	return str.join(op);
};

explode = function(op,str){
	var p = str.indexOf(op);
	return p === -1?[str]:[str.substr(0,p),str.substr(p+op.length)];
};

time = function(o){
	var t = o||new Date();
	return parseInt(t.getTime()/1000);
};

date = function(str){
	if(!str)str = 'Y-m-d H:i:s';
	var t;
	switch(arguments.length){
		case 0:
		case 1:
			t = new Date();
		break;
		case 2:
			t = new Date(parseInt(arguments[1]+'000'));
		break;
	}
	var Y = t.getFullYear();
	var y = t.getFullYear().toString().substr(2);
	var m = t.getMonth()+1;
	var d = t.getDate();
	var H = t.getHours();
	var i = t.getMinutes();
	var s = t.getSeconds();
	if(m < 10)m = '0'+m;
	if(d < 10)d = '0'+d;
	if(H < 10)H = '0'+H;
	if(i < 10)i = '0'+i;
	if(s < 10)s = '0'+s;
	str = str.replace(/Y/g,Y);
	str = str.replace(/y/g,y);
	str = str.replace(/m/g,m);
	str = str.replace(/d/g,d);
	str = str.replace(/H/g,H);
	str = str.replace(/i/g,i);
	str = str.replace(/s/g,s);
	return str;
}

filemtime = function(){
	var fs = require("fs");
	return function(path){
		return new Promise(function(resolve) {
			fs.stat(path,(err,info)=>resolve(info?info.mtime.getTime():0));
		});
	};
}();

is_file = function(){
	var fs = require("fs");
	return function(path){
		return new Promise(function(resolve) {
			fs.exists(path,resolve);
		});
	};
}();

mkdir = function(){
	var fs = require('fs');
	var path = require('path');
	return function(dirname,callback){  
		fs.exists(dirname,function(exists){  
			if (exists) {  
				callback();  
			} else {  
				mkdir(path.dirname(dirname), function () {  
					fs.mkdir(dirname, callback);  
				});
			}
		});
	}
}();

unlink = function(){
	var fs = require("fs");
	return function(path,_fn){
		fs.unlink(path,function(e){if(typeof _fn === 'function')_fn(e)});
	};
}();

dirname = function(){
	var path= require("path");
	return function(name){
		return path.dirname(name);
	};
}();

basename = function(){
	var path= require("path");
	return function(name){
		return path.basename(name);
	};
}();

extname = function(){
	var path= require("path");
	return function(name){
		return path.extname(name);
	};
}();

file_md5 = function(path,_fn){
	var fs = require('fs');
	var crypto = require('crypto');

	var md5sum = crypto.createHash('md5');
	var stream = fs.createReadStream(path);
	stream.on('data', function(chunk) {
		md5sum.update(chunk);
	});
	stream.on('end', function() {
		_fn(md5sum.digest('hex').toUpperCase());
	});
};

_reg = function(reg,str){
	var r = [],result,re = new RegExp(reg,'g'),arr;
	while((result = re.exec(str)) !== null){
		arr = [];
		for(var i = 0;i!==result.length;++i)arr.push(result[i]);
		r.push(arr)
	}
	return r;
}

preg_split = function(str,reg,num = 0){
	var r = [],result,re = new RegExp(reg,'g'),arr,_i = 0,index = 0;
	while((result = re.exec(str)) !== null && (num == 0 || _i < num - 1)){
		++_i;
		r.push(str.substr(index,result.index - index))
		index = re.lastIndex;
	}
	r.push(str.substr(index));
	return r;
}

str_replace = function(a,b,str){
	return str.split(a).join(b);
}

url_path = function(path){
	path = path.replace(new RegExp('\\\\','g'),'/');
	var last = '';
	while(path != last){
		last = path;
		path = path.replace(new RegExp('/\\/[^\\/]+\\/\\.\\.\\//','g'),'/');
	}
	last = '';
	while(path != last){
		last = path;
		path = path.replace(new RegExp('/([\\.\\/]\\/)+/','g'),'/');
	}
	return path;
}

object_clone = function(o){
	if(Object.prototype.toString.call(o) === '[object Object]'){
		var n = {};
		for(var i in o)n[i] = object_clone(o[i]);
		return n;
	}else if(Object.prototype.toString.call(o) === '[object Array]'){
		var n = [];
		for(var i = 0,s = o.length;i!==s;++i)n.push(object_clone(o[i]));
		return n;
	}else{
		return o;
	}
}

var xaoi = {};

xaoi.ws = function(port){
	var ws = require("nodejs-websocket");
	var ids = function(){
		var maxid = 1;
		var dels = [];
		return function(id){
			if(id){
				dels.push(id);
			}else{
				if(dels.length === 0){
					return maxid++;
				}else{
					return dels.splice(0,1)[0];
				}
			}
		};
	}();
	var r = {};
	var conns = {};
	r.onopen = function(){};
	r.onmessage = function(){};
	r.onerror = function(){};
	r.onclose = function(){};
	r.send = function(id,d){
		if(typeof conns[id] !== 'undefined')conns[id].sendText(JSON.stringify(d));
	};
	r._send = function(d){
		for(var id in conns){
			conns[id].sendText(JSON.stringify(d));
		}
	};
	r.open = function(_fn){
		var server = ws.createServer(function(conn){
			var id = ids();
			conns[id] = conn;
			conn.on("text", function (d) {
				xaoi.log('收到消息:',id,d)
				try {
					d = JSON.parse(d);
				} catch(e) {
					return;
				}
				r.onmessage(id,d);
			})

			conn.on("error", function (code, reason) {
				xaoi.log("异常关闭"+id)
				r.onerror(id);
			});

			conn.on("close", function (code, reason) {
				delete conns[id];
				ids(id);
				xaoi.log("关闭连接"+id)
				r.onclose(id);
			});
			//onopen
			r.onopen(id);
		}).listen(port);
		_fn();
	}
	return r;
};

module.exports = xaoi;