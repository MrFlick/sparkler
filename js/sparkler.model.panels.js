var sparkler = sparkler || {};
sparkler.model = sparkler.model || {};

var shifted, ctrled;
$(document).bind('keyup keydown', function(e){shifted = e.shiftKey; ctrled=e.ctrlKey || e.metaKey;} );

sparkler.model.panels = Backbone.Collection.extend({
	model: sparkler.model.panel
})

