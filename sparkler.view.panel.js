var sparkler = sparkler || {};
sparkler.view = sparkler.view || {};

sparkler.view.panel = Backbone.View.extend({
	tagName: 'div',
	className: 'plotpanel',
	initialize: function() {
		this.app = this.options.app;
		this.app.on('change:selected', this.updateSelection, this);
		this.model.on('change:xvar change:yvar change:groupvar', this.updateControls, this);
		this.model.on('destroy', this.remove, this);
		this.shapers = {
			"scatter": this.shapeScatterPlot,
			"density": this.shapeDensityPlot
		};
		this.redrawData = _.debounce(this.rawRedrawData, 50);
		this.justselected = false;
		this.recodeMainToPanel = [];
		this.recodePanelToMain = [];
	},
	render: function() {
	    this.plot = $("<div class='flotplot' style='width:400px;height:400px;float:left'></div>");
		this.legend = $("<div class='flotlegend' style='float:left'></div>");

		this.$xvarselect = $("<select class='xvar'>");
		this.addvalstoselect(this.$xvarselect, this.app.get("obsvars"));

		this.$yvarselect = $("<select class='yvar'>");
		this.addvalstoselect(this.$yvarselect, this.app.get("obsvars"), true);

		this.$groupselect = $("<select class='groupvar'>");
		this.addvalstoselect(this.$groupselect, this.app.get("groupvars"), true);
		this.$groupselect.val(this.model.get("groupvar"));

		this.updateControls();

		var swapbutton = $("<button title='swap x and y' class='swapxy'>").html("&otimes;");

		this.$el.append(this.plot, this.legend);
        this.$el.append($("<div class='plotcontrols' style='float:left;clear:left'>").
            append("X:").append(this.$xvarselect).
            append(swapbutton).
            append(" Y:").append(this.$yvarselect).
            append(" Groups:").append(this.$groupselect).
            append("<br style='clear:both'>")
        );
		return this;
	},
	events: {
		"click .swapxy": "swapxy",
		"change .xvar" : "changexyg",
		"change .yvar" : "changexyg",
		"change .groupvar" : "changegroup",
		"click .flotlegend tr": "toggleGroup",
		"click": "acknowledgeClick", 
		"plotselected .flotplot" : "pointsSelected",
		"plotclick .flotplot" : "pointClicked"
	},
	updateControls: function() {
		this.$xvarselect.val(this.model.get("xvar"));
		this.$yvarselect.val(this.model.get("yvar"));
		this.$groupselect.val(this.model.get("groupvar"));
		this.redrawData();
	},
	rawRedrawData: function() {
		//Dont call this directly, use this.redrawData (a debounced version of the function)
		var type = this.model.get("plottype");
		var xvar = this.model.get("xvar");
		var yvar = this.model.get("yvar");
		var gvar = this.model.get("groupvar");
		if(type == "auto") {
			if (yvar) {
				type="scatter";
			} else {
				type="density";
			}
		}
		if (this.shapers[type]) {
			var rawData = this.app.getdata(xvar,yvar,gvar);
			var shapedData = this.shapers[type](rawData[0], rawData[1], rawData[2], this.model.get("groupselect"));

			var plotOptions = {
				grid: {clickable:true,hoverable:false, autoHighlight:false, backgroundColor: 'white'},
				legend: {show:false},
				xaxis: {axisLabel: xvar},
				yaxis: {axisLabel: yvar}
			}
			
			if(shapedData.opts) {
				plotOptions = _.defaults(shapedData.opts, plotOptions);
			}
			this.recodeMainToPanel = shapedData.m2p;
			this.recodePanelToMain = shapedData.p2m;

			this.flot = $.plot(this.plot, shapedData.data||shapedData, plotOptions);
			this.updateSelection();
			this.drawLegend();

		} else {
			this.logme("bad plot type:" + type);
		}
	},
	drawLegend: function() {
		var series = this.flot.getData();
		var gvar = this.model.get("groupvar");
		var fragments = [];

		makeEntry = function(x,group,selected) {
			selected = selected || 0;
			var gl = (entry.grouplevel != null) ? " data-group='" + entry.grouplevel+ "'": "" ;
			return('<tr' + gl+ '>' + 
				'<td class="legendColorBox"><div style="border:1px solid #ccc;padding:1px">'+
				'<div style="width:4px;height:0;border:5px solid ' + entry.color + ';overflow:hidden"></div></div></td>' +
				'<td class="legendLabel">' + (selected ? "<strong>" + x + "</strong>" :x) + '</td></tr>')
		}
		var fragments = [];
		if (gvar) {
			var groups = this.app.getdata(gvar)[0].groups();
			var highlight = this.model.get("groupselect");
			for(var i=0; i<series.length; i++) {
				var entry = series[i];
				if(entry.label && entry.grouplevel != null) {
					fragments[entry.grouplevel] = makeEntry(entry.label, entry.grouplevel,highlight.indexOf(entry.grouplevel)>-1); 
				}
			}
		} else {
			for(var i=0; i<series.length; i++) {
				var entry = series[i];
				if(entry.label) {
					fragments.push(makeEntry(entry.label))
				}
			}
		}
		if(fragments.length) {
			this.$(".flotlegend").html('<table style="font-size:smaller;color:#545454">' + fragments.join("") + '</table>')
		} else {
			this.$(".flotlegend").html('')
		}
	},
	toggleGroup: function(event) {
		var group = event.currentTarget.getAttribute("data-group");
		if (group != null) {
			group = parseInt(group);
			var groups = this.model.get("groupselect").splice(0);
			var idx = groups.indexOf(group);
			if(idx>-1) {
				groups.splice(idx,1)
			} else {
				groups.push(group)
			}
			this.model.set("groupselect", groups)
			this.redrawData();
		}
	},
	//selection
	pointsSelected: function(event, ranges) {
        var choosen=new Array();
        var series = this.flot.getData();
        for(s=0; s<series.length; s++) {
			if(series[s].clickable) {
				var seriesdata = series[s].data;
				for(var i=0; i<seriesdata.length; i++) {
					if (seriesdata[i][0]>=ranges.xaxis.from & seriesdata[i][0]<=ranges.xaxis.to &
						seriesdata[i][1]>=ranges.yaxis.from & seriesdata[i][1]<=ranges.yaxis.to) {
						choosen.push(this.convertPanelToMain(s,i));
					}
				}
			}
        }
        this.flot.clearSelection(true);
		this.processSelection(choosen);
        this.justselected=true;
	},
	pointClicked: function(event, pos, item) {
		if(!this.justselected) {
			if(item) {
				this.processSelection(this.convertPanelToMain(item.seriesIndex, item.dataIndex));
			} else if (!shifted && !ctrled) {
				this.processSelection();
			}
		}
        this.justselected=false;
	},
	processSelection: function(p) {
		if(shifted) {
			this.app.addSelection(p);
		} else if (ctrled) {
			this.app.removeSelection(p);
		} else {
			this.app.setSelection(p);
		}
	},
	updateSelection: function() {
		this.flot.unhighlight();
		var selids = this.app.get("selected");
		for(var i=0; i<selids.length; i++) {
			var pair = this.convertMainToPanel(selids[i]);
			if(pair) {
				this.flot.highlight(pair[0], pair[1]);
			}
		}
	},
	convertMainToPanel: function(idx) {
		if (this.recodeMainToPanel) {
			return this.recodeMainToPanel[idx];
		}
	},
	convertPanelToMain: function(series, idx) {
		if(this.recodePanelToMain) {
			return (this.recodePanelToMain[series]) ? this.recodePanelToMain[series][idx] : null;
		} else {
			return null;
		}
	},
	//update model
	changegroup: function() {
		this.model.set("groupselect", []);
		this.changexyg();
	},
	changexyg: function() {
		this.model.set({xvar:this.$xvarselect.val(), yvar:this.$yvarselect.val(), groupvar:this.$groupselect.val()})
	},
	swapxy: function() {
		this.model.set({xvar:this.model.get("yvar"), yvar:this.model.get("xvar")})
	},
	logme: function(x) {
		console.log("logme" + ((x)?": "+x:""));
	},
	addvalstoselect: function(box, vals, addblank) {
		if(addblank){
			box.append($('<option>').text(""));
		}
		$.each(vals, function(idx, val) {   
			box.append($('<option>').text(val)); 
		});
	},
	acknowledgeClick: function() {
		if(this.app.get("mode")=="delete") {
			this.model.destroy();
		}
	},
	//data shapers
	//should return {data: folotformattedseries, opt: flotoptions
	//	p2m: [s,i]->[m] mpping, m2p: [m]->[s,i] mapping}
	shapeScatterPlot: function(xvals, yvals, gvals, ghighlight) {
		var ngroups = (gvals) ? gvals.levels.length : 1;
		var series = [];
		var encode = [], decode = [];
		var gorder=_.range(ngroups); gcolors=sparkler.util.getColors(ngroups);
		if(ghighlight && ghighlight.length>0) {
			var greorder = _.difference(gorder, ghighlight).concat(ghighlight);
			for(var i=0; i<ngroups; i++) {
				gorder[greorder[i]]=i;
				if(ghighlight.indexOf(i)==-1) {
					gcolors[i]="#eee";
				}
			}
		}
		for(var i=0; i<ngroups; i++) {
			series[gorder[i]] = {
				data: [],
				clickable: true,
				grouplevel: i,
				color: gcolors[i],
				label: (gvals && gvals.levels) ? gvals.levels[i] : null,
				points: {show: true}
			}
			decode[gorder[i]]=[];
		}
		var g=0;
		for(var i=0; i<xvals.getLength(); i++){
			g=(gvals) ? gorder[gvals.getGroup(i)] : 0;
			series[g].data.push([xvals.getValue(i),yvals.getValue(i)]);
			decode[g].push(i);
			encode.push([g, decode[g].length-1])
		}
		return({data:series, p2m: decode, m2p: encode, opts:{selection:{mode:"xy"}}});
	},
	shapeDensityPlot: function(xvals, yvals, gvals, ghighlight) {
		var ngroups = (gvals) ? gvals.levels.length : 1;
		var series = [];
		var encode = [], decode = [];
		var gorder=_.range(ngroups); gcolors=sparkler.util.getColors(ngroups);
		if(ghighlight && ghighlight.length>0) {
			var greorder = _.difference(gorder, ghighlight).concat(ghighlight);
			for(var i=0; i<ngroups; i++) {
				gorder[greorder[i]]=i;
				if(ghighlight.indexOf(i)==-1) {
					gcolors[i]="#eee";
				}
			}
		}
		for(var i=0; i<ngroups; i++) {
			series[gorder[i]] = {
				data: [],
				clickable: false,
				color: gcolors[i],
				lines: {show: true}
			}
			series[gorder[i] + ngroups] = {
				data: [],
				clickable: true,
				grouplevel: i,
				color: gcolors[i],
				label: (gvals && gvals.levels) ? gvals.levels[i] : null,
				points: {show: true}
			}
			decode[gorder[i]+ngroups]=[];
		}
		var g=0;
		for(var i=0; i<xvals.getLength(); i++){
			g=((gvals) ? gorder[gvals.getGroup(i)] : 0)+ngroups;
			series[g].data.push(xvals.getValue(i));
			decode[g].push(i);
			encode.push([g, decode[g].length-1])
		}
		for(var i=0; i<ngroups; i++) {
			var density = sparkler.util.kde(series[i+ngroups].data);
			series[i].data = density.curve;
			series[i+ngroups].data = density.jittered
		}
		return({data:series, p2m: decode, m2p: encode, opts:{selection:{mode:"x"}}});
	}
});
