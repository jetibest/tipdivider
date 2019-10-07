const fs = require('fs');
const path = require('path');
const bodyparser = require('body-parser');

const filedb = module.exports = {
	fname: function(id)
	{
		return path.resolve(__dirname, 'private_storage/db-' + ((id || '')+'').replace(/[^a-f0-9]+/gi, '') + '.txt');
	},
	version: function(id)
	{
		return new Promise(function(resolve, reject)
		{
			fs.stat(filedb.fname(id), function(err, stat)
			{
				if(err)
				{
					return resolve(false);
				}
				resolve(stat.mtime +'');
			});
		});
	},
	save: function(id, data)
	{
		return new Promise(function(resolve, reject)
		{
			fs.promises.writeFile(filedb.fname(id), data, 'utf8')
			.then(async function()
			{
				resolve(await filedb.version(id));
			})
			.catch(function()
			{
				resolve(false);
			});
			
		});
	},
	load: function(id)
	{
		return new Promise(function(resolve, reject)
		{
			fs.promises.readFile(filedb.fname(id), 'utf8')
			.then(resolve)
			.catch(function()
			{
				resolve(null);
			});
		});
	},
	middleware: function(options)
	{
		options = options || {};
		
		var jsonparser = bodyparser.json({limit: options.maxRequestSize || '16mb'});
		
		return function(req, res, next)
		{
			jsonparser(req, res, async function()
			{
				req.body = req.body || {};
				if(req.body.action === 'save-data')
				{
					var id = req.body.id;
					var data = req.body.data;
					var ret = {};
					
					if(ret.version = await filedb.save(id, data))
					{
						ret.result = 'ok';
					}
					else
					{
						ret.result = 'error';
					}
					
					res.json(ret);
				}
				else if(req.body.action === 'load-data')
				{
					var id = req.body.id;
					var version = req.body.version;
					
					var ret = {};
					if(version === await filedb.version(id))
					{
						ret.result = 'ok';
						ret.version = version;
					}
					else
					{
						if((ret.data = await filedb.load(id)) !== null)
						{
							ret.version = await filedb.version(id); // not strictly required, but nice for easy comparison on client side
							ret.result = 'ok';
						}
						else
						{
							ret.result = 'error';
						}
					}
					res.json(ret);
				}
				else
				{
					next();
				}
			});
		};
	}
};
