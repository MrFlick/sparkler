var sparkler = sparkler || {};
sparkler.view = sparkler.view || {};

sparkler.view.app = Backbone.View.extend({
    el: '#sparkler',
	initialize: function() {
		this.model.on("paneladd", this.insertPanel, this);
		this.model.on("change:selected", this.updateSelection, this);
	},
	render: function() {
		this.$add = $("<button class='addpanel'>add panel</button>");
		this.$el.append($("<div>").addClass("ctrlbar").append(this.$add));
		this.$pc = $("<div>").addClass("panelcontainer");
		this.$el.append(this.$pc);
		this.$selinfo = $("<div>").addClass("selinfo").text(" ");
		this.$el.append($("<div>").addClass("selectbar").append(this.$selinfo));
		this.updateSelection();
		return this;
	},
	events: {
		"click .addpanel" : "requestAdditionalPanel",
		"click .dumpselected" : "dumpSelection"
	},
	requestAdditionalPanel: function() {
		this.model.addPanel();
	},
	insertPanel: function(panel) {
		var pv = new sparkler.view.panel({model:panel, app:this.model});
		pv.render()
		this.$pc.append(pv.$el);
	},
	updateSelection: function() {
		var selids = this.model.get("selected"); 
		var selcount = selids.length;
	    this.$selinfo.empty().text(selcount + " sample(s) selected")
		if(selcount) {
			this.$selinfo.wrapInner($("<a>").attr("href","#").addClass("dumpselected"));
			if(selcount<2) {
				var selname = this.model.getObservationName(selids[0]);
				if (name != null) {
					this.$selinfo.append(" (" +  selname + ")");
				}
			}
		};
	},
	dumpSelection: function() {
		var selids = this.model.get("selected"); 
		var newdoc = window.open(name="selectedids").document;
		for(var i=0; i<selids.length; i++) {
			newdoc.write(this.model.getObservationName(selids[i]) +"<br/>");
		}	
		return false;
	}
});
