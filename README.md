# xaoi-template-vue
类似vue脚手架，可按需加载组件，保存自动刷新
```
//配置
var config = {
	dir:[
		/*
			[object]模板编译
			[string]编译es与less
		*/
		{
			base:'D:/Task/git/blog/www/view',		//监听目录
			dist:'D:/Task/git/blog/www/index',		//生成目录	，不能是【监听目录】子目录，容易死循环
			path(dir){								//返回常量【参数是不带后缀地址】
				var __root__ = '/index';
				var __static__ = '/static';
				var __home__ = __static__+'/index';
				return {
					__ROOT__:__root__,
					__STATIC__:__static__,
					__LIB__:__static__+'/lib',
					__DIR__:__root__+'/'+dir,
					__HOME__:__home__,
					__THIS__:__home__+'/'+dir,
					__NAME__:str_replace('/','_',dir),
				}
			}
		},
		'D:/Task/git/blog/www/static1',		//普通目录-编译es与less
		'D:/Task/git/blog/www/static2',
		'D:/Task/git/blog/www/static3',
	],
	css:{
		compress:true		//压缩css
	},
	//自动刷新 可关闭
	ws:{
		host:'0.0.0.0',
		port:0				//自动端口 可设为固定的
	}
};

module.exports = config;

```
