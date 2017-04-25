var sparkler = sparkler || {};
sparkler.model = sparkler.model || {};

var shifted, ctrled;
$(document).bind('keyup keydown', function(e){shifted = e.shiftKey; ctrled=e.ctrlKey || e.metaKey;} );

sparkler.model.app = Backbone.Model.extend({
	defaults: {
		obsvars: [],
		groupvars: [],
		idvars: [],
		dataset: {},
		selected: [],
		mode: "load"
	},
	render: function() {
		if(this.view) {
			this.view.$el.empty();
		}
		if(this.get("mode")=="load") {
			this.view = new sparkler.view.load({model:this});
			this.view.on("datareceived", this.dataReceived, this);
			this.view.render();
		} else if(this.get("mode")=="loading") {
			this.view.$el.append("<img src='loading.gif'/>");
		} else if(this.get("mode")=="view") {
			this.view = new sparkler.view.app({model:this});
			this.view.render();
			if(this.panels.length==0) {
				this.addPanel();
			}
		}
	},
	initialize: function() {
		this.panels = new sparkler.model.panels;
		this.panels.on("add", function( model, opts) {
			this.trigger("paneladd", model, opts);
		}, this);
	},
	addPanel: function(attr) {
		this.panels.add(attr, {app: this});
	},
	suggestXY: function() {
		var obsvars = this.get("obsvars");
		var suggest = {};
		if(obsvars)	{
			if (obsvars.length>=1) {
				suggest["xvar"]=obsvars[0];
			}
			if (obsvars.length>=2) {
				suggest["yvar"]=obsvars[1];
			}
		}
		return suggest;
	},
	setData: function(data) {
		var obs=[],groups=[],ids=[];
		var anystrings = function(x, p) {
			for(var i=0; i<x.length && i<p; i++) {
				if (typeof x[i]==="string") {
					return true;
				}
			}
			return false;
		}
		for(var name in data) {
			if (anystrings(data[name], 25)) {
				data[name] = new sparkler.util.CategoricalVar(data[name]);
				if(data[name].levels.length==data[name].data.length) {
					ids.push(name);
				} else {
					groups.push(name);
				}
			} else {
				data[name] = new sparkler.util.ContinuousVar(data[name]);
				obs.push(name);
			}
		}
		this.set({dataset:data, obsvars:obs, groupvars:groups, idvars: ids});

	},
	getdata: function() {
		var data = this.get("dataset");
		var out = [];
		for(var i=0; i<arguments.length; i++) {
			out.push(data[arguments[i]])
		}
		return out;
	},
	dataReceived: function(msg) {
		this.view.off("datareceived");
		if(msg.data) {
			var result = this.parseTextData(msg.data);
			if(result.data) {
				this.dataLoaded(result);
			} else {
				this.dataFailed(result);
			}
		}
	},
	dataLoading: function() {
		this.set("mode", "loading");
		this.render();
	},
	dataLoaded: function(data) {
		this.setData(data.data);
		this.set("mode","view");
		this.render();
	},
	dataFailed: function(msg) {
		var message = "<h4>Loading Error</h4>";
		if(msg.errors) {
			message += "<ul><li>" + msg.errors.join("</li><li>") + "</li></ul>"
		}
		sparkler.util.modal.open({content: message})
		this.set("mode", "load");
		this.render();
	},
	addSelection: function(sel) {
		if (sel == null) return;
		var current = this.get("selected").slice(0);
		var add = function (x) {if(x==null) return; if (current.indexOf(x)<0) current.push(x)};
		if (sel instanceof Array) {
			for(var i=0; i<sel.length; i++) {
				add(sel[i]);
			}
		} else {
			add(sel);
		}
		this.set({selected: current});
	},
	removeSelection: function(sel) {
		if (sel == null) return;
		var current = this.get("selected").slice(0);
		var rem = function (x) {if (x==null) return; idx = current.indexOf(x); if(idx>-1) current.splice(idx,1)};
		if (sel instanceof Array) {
			for(var i=0; i<sel.length; i++) {
				rem(sel[i]);
			}
		} else {
			rem(sel);
		}
		this.set({selected: current});
	},
	setSelection: function(sel) {
		this.set({selected: []});
		this.addSelection(sel);
	},
	getObservationName: function(i) {
		if (this.get("idvars").length) {
			return 	_.map(this.get("idvars"), function(v) {return this.get("dataset")[v].getValue(i)}, this).join("-");
		} else {
			return i;
		}
	},
	parseTextData: function(data) {
		var lines = data.split(/\r\n?|\n/);
		var naStrings = [".", "NA"]
		var delim=null;
		var removeQuotes=false;
		var headers=null;
		var outdata = {};
		var stripquotes = function(x, d) {
			var start=-1;
			for(var j=0; j<x.length; j++) {
				if (start==-1 && /^["]/.test(x[j])) {
					x[j]=x[j].substr(1)
					start=j
				}
				if (start>-1 && /["]$/.test(x[j])) {
					x[j]=x[j].substr(0, x[j].length-1)
					x.splice(start,j-start+1,x.slice(start,j+1).join(d)) 
					j=start;
					start=-1;
				}
			}
		}
		for(var i=0, line; i<lines.length; i++) {
			line=lines[i]
			if(line.indexOf("#")==0) continue;
			if(line.length<1) continue;
			if(delim === null) {
				var tabs = (line.match(/\t/g)||[]).length;
				var commas = (line.match(/,/g)||[]).length;
				if(tabs) {
					delim = "\t";
				} else if (commas) {
					delim = ",";
					removeQuotes = /"/.test(line);
				} else {
					delim = /\s+/g;
				}
			}
			var cols = line.split(delim).map(sparkler.util.trim);
			if(removeQuotes) {
				stripquotes(cols,delim);
			}
			if (headers == null) {
				headers = cols;
				for (var col in cols) {
					if(col==0 && cols[col]=="") {
						cols[col] = "ROWNAME"
					}
					if (cols[col] in outdata) {
						return({data:null, errors:["Duplicate header name '" + cols[col] + "' at position " + (1+parseInt(col))]})
					}
					outdata[cols[col]] = [];
				}
				continue;
			} else if (cols.length==headers.length) { 
				for(var col in cols) {
					var val = cols[col];
					if (naStrings.indexOf(val)>-1) val=null;
					val = sparkler.util.isnumeric(val) ? Number(val) : val;
					outdata[headers[col]].push(val);
				}
			} else {
				var error = "Number of columns on line " + (i+1) + " (" + cols.length + ")" + 
					" does not match number of column headers (" + headers.length + ")";
				return({data:null, errors:[error]});
			}
		}
		return({data:outdata});
	}
});

