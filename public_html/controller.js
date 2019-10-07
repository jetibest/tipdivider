var controller = {
    state: {},
    saveModel: async function()
    {
        try
        {
            model.lastModifiedEpochMS = Date.now();
            
            var ret = await util.request('filedb.json', {action: 'save-data', id: await util.id(), data: await util.encrypt(JSON.stringify(model), await util.passphrase())});
            if(ret.result !== 'ok')
            {
                return false;
            }
            controller.state.version = ret.version;
            
            ui.trigger('model-save');
            
            return true;
        }
        catch(err)
        {
            util.catchError(err);
            return false;
        }
    },
    loadModel: async function()
    {
        try
        {
            var ret = await util.request('filedb.json', {action: 'load-data', id: await util.id(), version: controller.state.version});
            if(ret.result !== 'ok')
            {
                return model || controller.createNewModel();
            }
            if(ret.version === controller.state.version)
            {
                return model || controller.createNewModel(); // return existing model, if exists
            }
            var data = ret.data;
            var newmodel = JSON.parse(await util.decrypt(data, await util.passphrase()));
            if(!newmodel || !newmodel.type)
            {
                return controller.createNewModel();
            }
            controller.state.version = ret.version;
            return newmodel;
        }
        catch(err)
        {
            return controller.createNewModel();
        }
    },
    getPeriods: function()
    {
        return model.periods = model.periods || [];
    },
    createNewModel: function()
    {
        var epochMS = Date.now();
        return {
            "type": "TipDivider",
            "version": "1.0",
            "currency": {
                "prefix": "",
                "suffix": "PHP"
            },
            "ui": {
                "title": "Yechi's tip divider",
                "defaultPeriodName": "Restaurant - $month",
                "sortByName": false,
                "round": 0.01
            },
            "database": {
                "cleanTimerMS": 31*24*60*60*1000
            },
            "createdEpochMS": epochMS,
            "lastModifiedEpochMS": epochMS
        };
    },
    getPeriodById: function(id)
    {
        model.periods = model.periods || [];
        for(var i=0;i<model.periods.length;++i)
        {
            if(model.periods[i].id === id)
            {
                return model.periods[i];
            }
        }
        return null;
    },
    addPeriod: function(period)
    {
        if(period && !period.createdEpochMS)
        {
            var epochMS = Date.now();
            
            period.createdEpochMS = epochMS;
            period.lastModifiedEpochMS = epochMS;
            var existingPeriod = controller.getPeriodById(period.id);
            if(existingPeriod)
            {
                return existingPeriod;
            }
            
            (model.periods = model.periods || []).push(period);
            
            return period;
        }
    },
    createNewPeriod: function()
    {
        return {
            id: Date.now(),
            title: '',
            createdEpochMS: 0,
            lastModifiedEpochMS: 0,
            deletedEpochMS: 0,
            archivedEpochMS: 0,
            tips: [] // {amount: '150PHP', employees: [{name: 'Ruby'}, {name: 'Some'}, {name: 'Other'}], createdEpochMS: 0, lastModifiedEpochMS: 0, deletedEpochMS: 0}
        };
    },
    getTitle: function(period)
    {
        return period.title || '';
    },
    setTitle: function(period, title)
    {
        period.title = title || period.title || '';
    },
    getEmployeeKeyByName: function(name)
    {
        return (name || '').replace(/[^a-z0-9]+/gi, '').toLowerCase();
    },
    addEmployeeByName: function(name)
    {
        model.employees = model.employees || {};
        
        var key = controller.getEmployeeKeyByName(name);
        if(!model.employees[key])
        {
            model.employees[key] = {
                name: name,
                createdEpochMS: Date.now()
            };
        }
    },
    removeEmployeeByNameIfNotUsed: function(name)
    {
        var key = controller.getEmployeeKeyByName(name);
        
        // check if employee is still used by any tip in any period (use key to check for a match)
        if(model.periods)
        {
            for(var i=0;i<model.periods.length;++i)
            {
                var tips = model.periods[i].tips;
                
                if(tips)
                {
                    for(var j=0;j<tips.length;++j)
                    {
                        var tip = tips[j];
                        if(!tip.deleted && !tip.deletedEpochMS)
                        {
                            var employees = tip.employees;
                            
                            if(employees)
                            {
                                for(var k=0;k<employees.length;++k)
                                {
                                    if(controller.getEmployeeKeyByName(employees[k].name) === key)
                                    {
                                        return;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        
        
        delete model.employees[key]; // delete employee entry
    },
    listEmployees: function()
    {
        var list = [];
        for(var k in model.employees)
        {
            if(Object.prototype.hasOwnProperty.call(model.employees, k))
            {
                list.push(model.employees[k]);
            }
        }
        
        list.sort(function(a, b)
        {
            return (a.name || '').localeCompare(b.name || '');
        });
        
        return list;
    },
    addTip: function(period, amount, employeeNames)
    {
        var map = {};
        var employees = [];
        for(var i=0;i<employeeNames.length;++i)
        {
            var name = employeeNames[i];
            var key = controller.getEmployeeKeyByName(name);
            if(name && !map[key])
            {
                map[key] = true;
                
                controller.addEmployeeByName(name);
                
                employees.push({
                    name: name
                });
            }
        }
        
        employees.sort(function(a, b){return (a.name || '').localeCompare(b.name || '');});
        
        if(!employees.length)
        {
            return util.catchError('Select or type employee names.');
        }
        
        var epochMS = Date.now();
        
        period.tips.push({
            index: period.tips.length,
            amount: amount,
            employees: employees,
            createdEpochMS: epochMS,
            lastModifiedEpochMS: epochMS,
            deletedEpochMS: 0
        });
    },
    deleteTip: function(tip)
    {
        tip.deleted = true;
        tip.deletedEpochMS = Date.now();
        
        // check if we need to remove employees
        for(var i=0;i<tip.employees.length;++i)
        {
            controller.removeEmployeeByNameIfNotUsed(tip.employees[i].name);
        }
    },
    getTipsByPeriod: function(period)
    {
        var updated = false;
        var list = [];
        if(period)
        {
            period.tips = period.tips || [];
            
            for(var i=0;i<period.tips.length;++i)
            {
                var tip = period.tips[i];
                
                // ensure index is correct
                tip.index = i;
                
                // only add to list if not deleted
                if(!tip.deleted && !tip.deletedEpochMS)
                {
                    list.push(period.tips[i]);
                }
                else
                {
                    // tip was deleted, if it was long ago, clean-up the database.. and actually remove it, past 31 days
                    if(Date.now() - tip.deletedEpochMS > model.database.cleanTimerMS)
                    {
                        period.tips.splice(i, 1);
                        --i;
                        
                        updated = true;
                    }
                }
            }
        }
        
        if(updated)
        {
            controller.saveModel().catch(util.catchError); // ignore result
        }
        
        return list;
    },
    calculateTipsAggregate: function(tips, options)
    {
        options = options || {};
        
        var totalAmount = 0;
        
        var aggrmap = {};
        for(var i=0;i<tips.length;++i)
        {
            var tip = tips[i];
            if(tip.employees.length && tip.amount)
            {
                var amount = parseFloat(tip.amount);
                
                totalAmount += amount;
                
                var amountPerEmployee = amount / tip.employees.length;
                
                for(var j=0;j<tip.employees.length;++j)
                {
                    var employee = tip.employees[j];
                    aggrmap[employee.name] = amountPerEmployee + (aggrmap[employee.name] || 0);
                }
            }
        }
        
        var list = [];
        for(var k in aggrmap)
        {
            if(Object.prototype.hasOwnProperty.call(aggrmap, k))
            {
                list.push({
                    name: k,
                    amount: aggrmap[k]
                });
            }
        }
        
        // round amounts (while rounding, always use floor, as we cannot suddenly introduce money)
        var rounddiv = options.round || 0.01;
        for(var i=0;i<list.length;++i)
        {
            var item = list[i];
            item.amount = Math.floor(item.amount / rounddiv) * rounddiv;
        }
        
        // by default, sort by amount
        list.sort(function(a, b)
        {
            return b.amount - a.amount; // order by amount desc
        });
        
        // we can additionally sort by name (and amount secondarily)
        if(options.sort === 'name')
        {
            list.sort(function(a, b)
            {
                return a.name.localeCompare(b.name); // order by name asc
            });
        }
        
        var maxAmount = 0;
        var totalDividedAmount = 0;
        for(var i=0;i<list.length;++i)
        {
            var amount = list[i].amount;
            
            // round pay-out to cents
            // amount = Math.floor(100 * amount) / 100;
            
            maxAmount = Math.max(maxAmount, amount);
            totalDividedAmount += amount;
        }
        
        return {
            list: list,
            maxAmount: maxAmount,
            totalAmount: totalAmount,
            totalDividedAmount: totalDividedAmount,
            discrepancyAmount: totalAmount - totalDividedAmount
        };
    }
};
