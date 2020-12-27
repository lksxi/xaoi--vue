var $load = function(){
	var _head = document.getElementsByTagName('head')[0];
	var load = function(src,fn){
		var script = document.createElement("script");
        if (script.readyState) {
            script.onreadystatechange = function() {
                if (script.readyState == "loaded" || script.readyState == "complete") {
                    script.onreadystatechange = null;
                    fn();
                }
            }
        } else {
            script.onload = function() {
                fn();
            }
        }
        script.src = src;
        document.body.appendChild(script)
	};
	var scripts = [];
	var scripts_load = function(a,f,i){
		if(typeof a === 'string'){
			if(scripts.indexOf(a) === -1){
				load(a,function(){
					scripts.push(a)
					f()
				})
			}else{
				f()
			}
		}else{
			i = i||0
			if(typeof a[i] === 'string'){
				if(scripts.indexOf(a[i]) === -1){
					load(a[i],function(){
						scripts.push(a[i])
						if(i === a.length-1){
							f();
						}else{
							scripts_load(a,f,i+1);
						}
					})
				}else{
					if(i === a.length-1){
						f();
					}else{
						scripts_load(a,f,i+1);
					}
				}
			}else{
				var _a = []
				for(var j in a[i]){
					!function(s){
						if(scripts.indexOf(s) === -1){
							_a.push(new Promise(function(ok){
								load(s,function(){
									scripts.push(s)
									ok()
								})
							}));
						}else{
							_a.push(Promise.resolve());
						}
					}(a[i][j])
				}
				Promise.all(_a).then(function(){
					if(i === a.length-1){
						f();
					}else{
						scripts_load(a,f,i+1);
					}
				})
			}
		}
	};
	var cache = {
		style:{},
		script:{}
	};
	return function(path){
		return function(){
			return new Promise(function(ok){
					if(typeof cache.style[path] === 'undefined'){
						cache.style[path] = [];
					}
					if(typeof cache.script[path] === 'undefined'){
						cache.script[path] = [];
					}
					$load[path] = function(res,fn){
						for(var i in cache.style[path]){
							_head.removeChild(cache.style[path][i]);
						}
						cache.style[path] = [];
						for(var i in cache.script[path]){
							document.body.removeChild(cache.script[path][i]);
						}
						cache.script[path] = [];
						for(var i in res.style){
							var style = document.createElement('style');
							style.type = 'text/css';
							if(style.styleSheet){
								style.styleSheet.cssText = res.style[i];
							} else {  
								style.appendChild(document.createTextNode(res.style[i]));
							}
							cache.style[path].push(style);
							_head.appendChild(style);  
						}
						var f = function(){
							var d = fn.call(res)||{};
							d.template = res.template;
							ok(d);
						};
						if(typeof res.script === 'undefined'){
							f();
						}else{
							scripts_load(res.script,function(){
								f();
							})
						}
					};
					var script = document.createElement("script");
					script.src = $load.root + "/" + path + ".tpl?v=" + $load.v;
					cache.script[path].push(script);
					document.body.appendChild(script);
			});
		}
	};
}();
$load.v = function(){var d = document.scripts[document.scripts.length - 1];return d.src.substr(d.src.lastIndexOf("=") + 1)}();