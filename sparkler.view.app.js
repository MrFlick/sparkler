var sparkler = sparkler || {};
sparkler.view = sparkler.view || {};

sparkler.view.app = Backbone.View.extend({
    el: '#sparkler',
	initialize: function() {
		this.model.on("paneladd", this.insertPanel, this);
		this.model.on("change:selected", this.updateSelection, this);
		this.model.on("change:seltable", this.updateSelectionSummary, this);
	},
	render: function() {
		this.$add = $("<button class='addpanel'>add panel</button>");
		this.$el.append($("<div>").addClass("ctrlbar").append(this.$add));
		this.$pc = $("<div>").addClass("panelcontainer");
		this.$el.append(this.$pc);
		this.$selinfo = $("<div>").addClass("selinfo").text(" ");
		this.$selsummary = $("<div>").addClass("selsummary").text(" ");
		this.$el.append($("<div>").addClass("selectbar").append([this.$selinfo, this.$selsummary]));
		if(this.model.get("groupvars")) {
			this.$tablulateselect = $("<select class='seltabulate'>")
			var groups = this.model.get("groupvars");
			this.$tablulateselect.append($('<option>').text(""))
			for(var i=0; i<groups.length; i++) {
				this.$tablulateselect.append($('<option>').text(groups[i]))
			}
			this.$el.append($("<div>").append(this.$tablulateselect))
		}
		this.updateSelection();
		return this;
	},
	events: {
		"click .addpanel" : "requestAdditionalPanel",
		"click .dumpselected" : "dumpSelection",
		"change .seltabulate" : "changeTabulate",
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
		this.updateSelectionSummary()
	},
	updateSelectionSummary: function() {
		var selids = this.model.get("selected"); 
		var selcount = selids.length;
		this.$selsummary.empty();
		if(selcount>0 && this.model.get("seltable")) {
			var gd = this.model.getdata(this.model.get("seltable"))[0];
			var tots = new Array();
			for(var i=0; i < gd.levels.length; i++) {
				tots[i] = 0;
			}
			for(var i=0; i < selcount; i++) {
				tots[gd.data[selids[i]]] += 1;
			}
			var rows="";
			for(var i=0; i < gd.levels.length; i++) {
				if (tots[i]>0) {
					rows += "<tr><td>" + gd.levels[i] + "</td>"
					rows += "<td>" + tots[i] + "</td></tr>"
				}
			}
			this.$selsummary.append("<table>" + rows + "</table>")
		}
	},
	changeTabulate: function(e) {
	    var field = $(e.currentTarget);
		var value = $("option:selected", field).val();
		this.model.set("seltable", value)
		console.log(value);
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
