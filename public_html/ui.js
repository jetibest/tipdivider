// model operations: not needed, we work directly on the struct
var ui = {
    state: {
        view: 'main',
        sortByName: false,
        round: 0.01
    },
    awaiting: function()
    {
        // show loading overlay
        html.id('app').style.cursor = 'wait';
    },
    reload: function()
    {
        ui[ui.state.view]();
    },
    trigger: function(key)
    {
        if(key === 'model-save')
        {
            ui.state.modelLastSavedEpochMS = Date.now();
            
            html.setContent(html.id('ModelLastSavedTimestamp'), util.getHumanReadableTimestampFromEpochMS(ui.state.modelLastSavedEpochMS));
        }
        else if(key === 'url-update')
        {
            html.id('TipDividerURL').href = window.location.href;
        }
    },
    aggrTipItems: function(tips)
    {
        var aggr = controller.calculateTipsAggregate(tips, {
            sort: ui.state.sortByName ? 'name' : 'amount',
            round: ui.state.round
        });
        var n = aggr.list.length;
        
        if(!n)
        {
            // no tips to divide yet
            return html.label('No tips to divide yet.');
        }
        
        var elems = new Array(n);
        for(var i=0;i<n;++i)
        {
            var item = aggr.list[i];
            var divider = aggr.totalDividedAmount;
            var percentage = (!divider ? 0 : 100*item.amount/divider);
            
            var bar = html.div('tips-aggr-bar-inner', []);
            bar.style.width = percentage + '%';
            
            elems[i] = html.div('tips-aggr-row', [
                html.div('tips-aggr-col', html.label(item.name)),
                html.div('tips-aggr-col', html.label(util.floatToMoney(item.amount, model.currency))),
                html.div('tips-aggr-col', html.div('tips-aggr-bar', [bar, html.label(util.toDecimalString(percentage, 1) + '%')]))
            ]);
        }
        
        var totalAmountLabel = html.label('Total amount to be divided: ' + util.floatToMoney(aggr.totalAmount, model.currency) + ', left-over: ' + util.floatToMoney(aggr.discrepancyAmount, model.currency));
        
        totalAmountLabel.setAttribute('title', 'If total amount is too low or too high, you may correct it by adding a tip of a respectively negative or positive amount for all employees. Left-overs may be left in the tip box for the next time, then copy the left-over amount in a new tip for all employees in the new period.');
        
        return [
            html.div('tips-aggr-caption', [
                html.checkbox('Sort by name', ui.state.sortByName, function(checked)
                {
                    ui.state.sortByName = checked;
                    ui.entry(true);
                }),
                html.radio('round', 'Round to cents', ui.state.round === 0.01, function(checked)
                {
                    ui.state.round = 0.01;
                    ui.entry(true);
                }),
                html.radio('round', 'Round to whole amounts', ui.state.round === 1, function(checked)
                {
                    ui.state.round = 1;
                    ui.entry(true);
                }),
                html.radio('round', 'Round to tens', ui.state.round === 10, function(checked)
                {
                    ui.state.round = 10;
                    ui.entry(true);
                }),
                html.radio('round', 'Round to hundreds', ui.state.round === 100, function(checked)
                {
                    ui.state.round = 100;
                    ui.entry(true);
                })
            ]),
            html.div('tips-aggr-header', totalAmountLabel),
            html.div('tips-aggr-list', elems)
        ];
    },
    tipItem: function(tip)
    {
        return html.li([
            html.label(util.getHumanReadableTimestampFromEpochMS(tip.createdEpochMS)),
            html.label(tip.amount),
            html.label(util.forEach(tip.employees || [], function(employee)
                {
                    return employee.name;
                }).join(', ')),
            html.button('Remove', async function()
            {
                if(confirm('Are you sure you want to delete this tip? Press OK to delete.'))
                {
                    controller.deleteTip(tip);
                    ui.awaiting();
                    await controller.saveModel().catch(util.catchError);
                    ui.entry();
                }
            })
        ]);
    },
    entry: function(noFocus)
    {
        html.id('app').style.cursor = '';
        ui.state.view = 'entry';
        
        var isNew = !ui.state.selectedPeriodId;
        var ref = {};
        var period;
        
        if(isNew)
        {
            period = controller.createNewPeriod();
            ui.state.selectedPeriodId = period.id;
            controller.setTitle(period, util.formatVariableString(model.ui.defaultPeriodName, {date: util.getDateHumanReadable(), month: util.getMonthHumanReadable(), year: util.getYearHumanReadable()}));
        }
        else
        {
            period = controller.getPeriodById(ui.state.selectedPeriodId) || controller.createNewPeriod();
        }
        
        var tips = controller.getTipsByPeriod(period);
        var title = controller.getTitle(period);
        
        ui.setView(html.div('view-entry', [
            html.div('', [
                html.h2([
                    html.button('Periods', ui.main),
                    html.label('/'),
                    ref.title = html.input('text', title, async function()
                    {
                        if(title === this.value)
                        {
                            return; // no changes, don't unnecessarily save model
                        }
                        controller.setTitle(controller.getPeriodById(ui.state.selectedPeriodId) || period, this.value);
                        
                        if(!isNew)
                        {
                            // if new, don't create new model-file until a tip has been added
                            ui.awaiting();
                            await controller.saveModel().catch(util.catchError);
                        }
                    })
                ]),
                html.div('tips-dialog', [
                    !tips.length ? [] : html.h3('Tips'),
                    !tips.length ? [] : html.div('tips-tablewrapper', html.ul(util.forEach(tips, ui.tipItem))),
                    html.h3('Add new tip'),
                    html.div('', [
                        html.dl([
                            html.dt(html.label('Tip amount:')),
                            html.dd([
                                html.label(model.currency.prefix || ''),
                                ref.amount = html.input('text', ''),
                                html.label(model.currency.suffix || '')
                            ]),
                            html.dt(html.label('Select employees currently at work (type to add employee):')),
                            html.dd(ref.employees = html.input('tags', util.forEach(controller.listEmployees(), function(v){return v ? v.name || '' : null;}).join(','), function(){}, {getTagKey: controller.getEmployeeKeyByName}))
                        ]),
                        html.button('Add tip', async function()
                        {
                            var amount = parseInt(ref.amount.value);
                            if(Number.isNaN(amount))
                            {
                                return util.catchError('Error: Fill in a correct amount ([0-9]).');
                            }
                            var employees = (ref.employees.getAttribute('data-value') || '').split(',');
                            period = controller.getPeriodById(ui.state.selectedPeriodId) || period;
                            controller.addTip(period, model.currency.prefix + ref.amount.value + model.currency.suffix, employees);
                            
                            controller.addPeriod(period); // if alreday added, it won't add again
                            
                            ui.awaiting();
                            await controller.saveModel().catch(util.catchError);
                            ui.entry();
                        })
                    ]),
                    !tips.length ? [] : html.h3('Computed tip per employee'),
                    !tips.length ? [] : html.div('tips-aggr-graph', ui.aggrTipItems(tips))
                ])
            ])
        ]));
        
        ref.amount.classList.add('number');
        
        if(!noFocus)
        {
            if(isNew)
            {
                ref.title.focus();
            }
            else
            {
                ref.amount.focus();
            }
        }
    },
    modelFile: function(period)
    {
        return html.li(html.button(period.title, async function()
        {
            ui.state.selectedPeriodId = period.id;
            ui.entry();
        }));
    },
    main: async function()
    {
        html.id('app').style.cursor = '';
        ui.state.view = 'main';
        
        var periods = controller.getPeriods();
        
        ui.setView(html.div('view-main', [
            html.div('', !periods || !periods.length ? [
                html.button('Tap here to start...', function()
                {
                    ui.state.selectedPeriodId = null;
                    ui.entry();
                })
            ] : [
                html.label('Choose a period:'),
                html.ul(util.forEach(periods, ui.modelFile)),
                html.button('Create New...', function()
                {
                    ui.state.selectedPeriodId = null;
                    ui.entry();
                })
            ])
        ]));
    },
    setView: function(container)
    {
        var linkref = html.link(window.location.href, 'this link');
        linkref.id = 'TipDividerURL';
        html.setContent(html.id('app'), html.div('page', [
            html.h1(model.ui.title),
            html.div('subheader', [
                html.label('Store '),
                linkref,
                html.label(' as bookmark or shortcut. If lost, entered data cannot be recovered.')
            ]),
            container,
            html.div('footer', [
                html.label('Last autosave: '),
                html.label.call({id: 'ModelLastSavedTimestamp'}, (ui.state.modelLastSavedEpochMS ? util.getHumanReadableTimestampFromEpochMS(ui.state.modelLastSavedEpochMS) : false) || 'Never'),
		html.label(' - '),
		html.link('privacy-policy.html', 'Privacy policy'),
                html.label(' - Made by MasterYeti.com')
            ])
        ]));
    },
    init: async function(options)
    {
        util.merge(ui.state, options || {}); // update state from options
        
        window.title = model.ui.title; // update window title from config in model
    }
};
