var express = require('express');
var path = require('path');
var filedb = require('./filedb.js');

var app = express.Router({strict: true});
app.use(function(req, res, next)
{
	var originalPath = req.headers['x-forwarded-original-path'];
	if(typeof originalPath !== 'string')
	{
		originalPath = req.path;
	}
	// if using a proxy, it has to provide the original path in a header
	// redirect /tipdivider to /tipdivider/, ensure a trailing slash
	// or in general case: if no file-extension, it should be a directory with trailing slash
	if(req.path.indexOf('.') === -1 && originalPath.substr(-1) !== '/')
	{
		res.redirect(302, originalPath + '/' + req.url.slice(req.path.length));
		return;
	}
	next();
});
app.use('/filedb.json', filedb.middleware());
app.use('/', express.static(path.resolve(__dirname, 'public_html')));

express({strict: true}).use(app).listen(parseInt(process.argv[2]) || 8080);
