var sparkler = sparkler || {};
sparkler.model = sparkler.model || {};

sparkler.model.panel = Backbone.Model.extend({
	defaults: {
		xvar:"",
		yvar:"",
		groupvar:"",
		groupselect:[],
		plottype:"auto"
	},
	initialize: function(attributes, options) {
		this.app = options.app;
		this.set(this.app.suggestXY())
	}
});
