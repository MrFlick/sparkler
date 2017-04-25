var sparkler = sparkler || {};
sparkler.view = sparkler.view || {};

sparkler.view.load = Backbone.View.extend({
    el: '#sparkler',
	initialize: function() {
		//this.model.on("paneladd", this.insertPanel, this);
	},
	render: function () {
		var message = "";
		if (window.Clipboard) {
			message = "Drag Data File Here Or Paste Data Onto Page";
		} else {
			message = "Drag Data File Here";
		}
		this.$el.append($("<div>").addClass("ctrlbar").text("Load Plot Data"));
		this.$pc = $("<div>").addClass("panelcontainer").addClass("dropzone").text(message);
		this.$el.append(this.$pc);
		this.$el.append($("<div>").addClass("selectbar").text("Waiting for Data"));
		return this;
	},
	events: {
		"paste" : "handleDataPaste",
		"dragover .dropzone": "handleFileDrag",
		"drop .dropzone": "handleFileDrop"
	},
	handleDataPaste: function(evt) {
		this.model.dataLoading();
		var e = evt.originalEvent;
		if(e.clipboardData) {
			var data = e.clipboardData.getData("text/plain");
			if (data) {
				this.trigger("datareceived", {data: data});	
			} else {
				alert("Text data not found in paste. Found Types:" +
					e.clipboardData.types.join(","))
			}
		}
	},
	handleFileDrag: function(evt) {
		evt.stopPropagation();
		evt.preventDefault();
		evt.originalEvent.dataTransfer.dropEffect = 'copy';
	},
	handleFileDrop: function(evt) {
		this.model.dataLoading();
		evt.stopPropagation();
		evt.preventDefault();

		var files = evt.originalEvent.dataTransfer.files;
		var that = this;
		for(var i =0,f; f=files[i]; i++) {
			var reader = new FileReader();
			reader.onloadend = function(e) {
				that.trigger("datareceived", {data: reader.result});	
			}
			reader.readAsText(f);
		}
		this.logme("drop");
	},
	logme: function(x) {
		console.log("logme" + ((x)?": " + x:""))
	}
});
