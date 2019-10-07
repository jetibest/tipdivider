var model;

(async function()
{
    model = await controller.loadModel().catch(util.catchError);

    window.autoloader = setInterval((function()
    {
        var lastModifiedEpochMS = model.lastModifiedEpochMS;
        return async function()
        {
            model = await controller.loadModel().catch(console.error);
            if(model.lastModifiedEpochMS !== lastModifiedEpochMS)
            {
                lastModifiedEpochMS = model.lastModifiedEpochMS;
                ui.reload();
            }
        };
    })(), 5000);
    
    await ui.init(model.ui);
    
    ui.main();
})();
