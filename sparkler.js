if(!Array.indexOf){
    Array.prototype.indexOf = function(obj){
        for(var i=0; i<this.length; i++){
            if(this[i]==obj){
                return i;
            }
        }
        return -1;
    }
}

function zip(arrayA, arrayB) {
    var length = Math.min(arrayA.length, arrayB.length);
    var result = [];
    for (var n = 0; n < length; n++) {
        result.push([arrayA[n], arrayB[n]]);
    }
    return result;
}

function kde(values, bins) {
	bins = bins ? bins : 100;
	var mean = 0, min=Infinity, max=-Infinity;
	for(var i in values) {
		var x=values[i];
		mean += x/values.length;
		min = (x<min)?x:min;
		max = (x>max)?x:max;
	}
	var v=0;
	for (var i in values) {
		var x = values[i];
		v += Math.pow(x-mean, 2)
	}
	var std = Math.sqrt(v/(values.length-1));
	var step = Math.max((max-min)/(bins-1),.01);
	var estdent = new Array();
	var obsheight = new Array();
	if(std>0 && step>0) {
		function fx (x0) {
			var r =0;
			for(var i in values) {
				r += Math.exp(-.5*Math.pow(values[i]-x0,2))
			}
			r *= 1/values.length/Math.sqrt(2*std*std*Math.PI)
			return r;
		}
		var lastval=0;
		var x = min;
		for(var a=0; a<bins || lastval>1e-3; a++, x+=step) {
			lastval=fx(x);
			estdent.push(new Array(x, lastval))
		}
		x = min-step;
		lastval = fx(x);
		while(lastval > 1e-3) {
			estdent.unshift(new Array(x, lastval))
			x -= step;
			lastval=fx(x);
		};
		for(var a in values) {
			obsheight.push(new Array(values[a], Math.random()*fx(values[a])));
		}
	} else {
		estdent = [null,null];
		for(var a in values) {
			obsheight.push(new Array(values[a], Math.random()));
		}
	}
	return {curve: estdent, jittered:obsheight};
}

function PanelController(container) {
	var removing=false;
	var panelname=1;
	panels = new Array();
	this.panels = panels;
	this.selids = new Array();
	this.panelcontainer = container;

	function initpanelplot(panel) {
		var plot;
		plot = $("<div class='flotplot' style='width:400px;height:400px;float:left'></div>");
		var legend = $("<div class='flotlegend' style='float:left'></div>");
		panel.plot = plot;
		panel.legend = legend;
		panel.box.append(plot);
		panel.box.append(legend);
	}

	function initpanelcontrols(panel, options) {
		var xvardef = (options)?options.xvar:0;
		var yvardef = (options)?options.yvar:1;
		var groupdef = (options)?options.group:"";
		var xvarselect = $("<select>");
		addvalstoselect(xvarselect, plotvars["vars"]);
		xvarselect.val(xvardef ? (typeof xvardef =="number" ? plotvars["vars"][xvardef] : xvardef): plotvars["vars"][0]);

		var yvarselect = $("<select>");
		addvalstoselect(yvarselect, plotvars["vars"], true);
		yvarselect.val(yvardef ? (typeof yvardef =="number" ? plotvars["vars"][yvardef] : yvardef): plotvars["vars"][1]);

		var groupselect = $("<select>");
		addvalstoselect(groupselect, plotvars["groups"], true);
		groupselect.val(groupdef ? groupdef: "");

		panel.getSettings = function() {
			return {xvar: xvarselect.val(), yvar: yvarselect.val(), group: groupselect.val()};
		}

		var swapbutton = $("<button title='swap x and y'>").html("&otimes;");
		swapbutton.click(function() {
			var xv = xvarselect.val();
			var yv = yvarselect.val();
			xvarselect.val(yv);
			yvarselect.val(xv);
			panel.updateplot();
		})

		var box = panel.box;
		xvarselect.change(panel.updateplot);
		yvarselect.change(panel.updateplot);
		groupselect.change(panel.updateplot);
		box.append($("<div class='plotcontrols' style='float:left;clear:left'>").
			append("X:").append(xvarselect).
			append(swapbutton).
			append(" Y:").append(yvarselect).
			append(" Groups:").append(groupselect).
			append("<br style='clear:both'>")
		);
	}

	this.addPanel = function(options) {
		var panel = new Object();
		panel.box = $("<div id=#"+panelname+" class='plotpanel'></div>");
		panel.name = "p" + (panelname++);
		panel.updateplot = function() {
			var settings = panel.getSettings();
			if(!settings.xvar) {
				return;
			}
			var groups;
			drawplot(panel, settings.xvar, settings.yvar, settings.group);
			updateSelection();
		}
		initpanelplot(panel);
		initpanelcontrols(panel, options);
		panels.push(panel);
		$(panelcontainer).append(panel.box);
		panel.updateplot();
		panel.box.click(function() {
			panelclicked(panel.name);	
		})
		panel.box.hover(function() {panelhover("in", panel)},function() { panelhover("out", panel) })
		return panel;
	}

	function cancelremovepanel() {
		removing = false;
		$(".plotpanel").removeClass("optremove");
	}
	this.clickRemove = function() {
		if(removing) {
			cancelremovepanel($(this));
		} else {
			removing = true;
		}
	}

	function panelclicked(name) {
		if(removing) {
			for(p in panels) {
				if (panels[p].name==name) {
					panels[p].box.detach();
					panels.splice(p,1)
					break;
				}
			}
		}
		cancelremovepanel();
	}
	function panelhover(direction, panel) {
		if(removing) {
			if(direction=="in") {
				panel.box.addClass("optremove")
			} else {
				panel.box.removeClass("optremove")
			}
		}

	}

	function getState(asUrl) {
		var state="";
		for(p in panels) {
			var settings = panels[p].getSettings();
			if(p>0) {state += "&"}
			state+= "plot=" + encodeURIComponent(settings.xvar + "," + settings.yvar + "," + settings.group);
		}
		if(selids) {
			var IDs = new Array();
			for(i in selids) {
				IDs.push(maindata.ID[selids[i]])
			}
			state += "&sel=" + encodeURIComponent(IDs.join(","));
		}
		if(asUrl) {
			state = document.location.protocol+"//"+document.location.host + document.location.pathname + "?" + state;
		}
		return(state);
	}
	this.getState = getState;
	this.setState = function(state) {
		var self = this;
		var parts = state.split("&");
		for(var i in parts) {
			var nv = parts[i].split("=");
			var name = nv[0];
			var values = decodeURIComponent(nv[1]).split(",");
			if(name == "plot") {
				self.addPanel({xvar:values[0], yvar:values[1], group:values[2]});
			} 
			if (name=="sel") {
				for( v in values) {
					var idx = maindata.ID.indexOf(values[v]);
					if(idx>-1) {
						selids.push(idx);
					}
				}
				updateSelection();
			}
		}
	}
}

var hiseries = -1;
var controller = new PanelController("#panelcontainer");
var selids = new Array();
var plotvars = {vars: new Array(), groups:new Array()}
var maindata;

var shifted, ctrled;
$(document).bind('keyup keydown', function(e){shifted = e.shiftKey; ctrled=e.ctrlKey || e.metaKey;} );

function drawplot(panel, xpc, ypc, groupvar) {
	var data=maindata;
	var groups;
	if (groupvar) {
		groups = factor(maindata[groupvar]);
	} else {
		groups = new Array(maindata[Object.keys(maindata)[0]].length);
		for (var i=0; i<groups.length; i++) {
			groups[i] = "Sample";
		}
		groups = factor(groups);
	}
	if (ypc) {
		draw2Dplot(panel, data, xpc, ypc, groups); 
	} else {
		drawDensity(panel, data, xpc, groups);
	}
	drawLegend(panel);
}

function drawLegend(panel) {
	var series = panel.flot.getData();
	var fragments = [];
	for(var i=0; i<series.length; i++) {
		var entry = series[i];
		if(entry.label) {
		fragments.push('<tr><td class="legendColorBox"><div style="border:1px solid #ccc;padding:1px"><div style="width:4px;height:0;border:5px solid ' + entry.color + ';overflow:hidden"></div></div></td>' +
		'<td class="legendLabel">' + entry.label + '</td></tr>')
		}
	}
	panel.legend.html('<table style="font-size:smaller;color:#545454">' + fragments.join("") + '</table>')
}

function drawDensity(panel, data,xpc,groups) {
    var s = new Array(groups.levels.length*2);
	var decode = new Array(groups.levels.length);
	var recode = new Array();
	for(var i=0; i<groups.levels.length; i++) {
		//density
		s[i]= {
			color: i,
			data: new Array(), 
			lines: {show:true}, 
			label: null,
			clickable: false
		};
		//data
		s[i+groups.levels.length] = {
			color: i,
			data: new Array(),
			points: {show:true},
			label: groups.levels[i],
			clickable: hiseries==-1 || i==hiseries
		}
		decode[i] = new Array();
	}
    var split = new Array(groups.levels.length);
    for(var i=0; i<(data[Object.keys(data)[0]]).length; i++) {
        if (data[xpc][i]===null) {
            recode.push(null)
        } else {
			if (!split[groups.obs[i]]) {
				split[groups.obs[i]] = [];
			}
            split[groups.obs[i]].push(data[xpc][i])
            decode[groups.obs[i]].push(i);
            recode.push(new Array(groups.obs[i]+groups.levels.length, split[groups.obs[i]].length-1))
        }
    }
	for(var i=0; i<split.length; i++) {
		var density = kde(split[i]);
		s[i].data = density.curve;
		s[i + split.length].data = density.jittered;
	}
	
    panel.flot = $.plot(panel.plot, s ,
        {grid: {clickable:true,hoverable:false, autoHighlight:false, backgroundColor: 'white'},
        selection: {mode:"x"},
        legend: {show:false, container:panel.legend, sorted:false},
        xaxis: {axisLabel: xpc},
        yaxis: {axisLabel: "density"}
        }
    )
    panel.id2to1 = function(series,seriesindex) {
		return decode[series-split.length][seriesindex];
    }
    panel.id1to2 = function(index) {
        return recode[index];
    }
    var justselected=false;
	panel.plot.unbind("plotselected");
    panel.plot.bind("plotselected", function(event, ranges) {
        var choosen=new Array();
        var series = panel.flot.getData();
        for(s=0; s<series.length; s++) {
			if(series[s].clickable) {
				var seriesdata = series[s].data;
				for(var i=0; i<seriesdata.length; i++) {
					if (seriesdata[i][0]>=ranges.xaxis.from & seriesdata[i][0]<=ranges.xaxis.to &
						seriesdata[i][1]>=ranges.yaxis.from & seriesdata[i][1]<=ranges.yaxis.to) {
							choosen.push(panel.id2to1(s,i));
					}
				}
			}
        }
        allselect(choosen);
        panel.flot.clearSelection(true);
        justselected=true;
    })
	panel.plot.unbind("plotclick");
    panel.plot.bind("plotclick", function(event, pos, item) {
        if(item && !justselected) {
            if(!shifted & !ctrled) {
                noneselect();
            }
            oneselect(panel.id2to1(item.seriesIndex, item.dataIndex));
            updateSelection();
            panel.flot.clearSelection(true);
        } else if (!justselected && !shifted && !ctrled) {
            allunselect();
        }
        justselected=false;
    })
}

function draw2Dplot(panel, data, xpc, ypc, groups) {
	var s = new Array(groups.levels.length);
	var decode = new Array(groups.levels.length);
	var recode = new Array();
	for(var i=0; i<s.length; i++) {
		s[i]= {
			data: new Array(), 
			points: {show:true}, 
			label: groups.levels[i],
			clickable: hiseries==-1 || i==hiseries
		};
		decode[i] = new Array();
	}
	for(var i=0; i<(data[Object.keys(data)[0]]).length; i++) {
		if (data[xpc][i]===null || data[ypc][i]===null) {
			recode.push(null)
		} else {
			s[groups.obs[i]].data.push(new Array(data[xpc][i], data[ypc][i]))
			decode[groups.obs[i]].push(i);
			recode.push(new Array(groups.obs[i], s[groups.obs[i]].data.length-1))
		}
	}

	panel.flot = $.plot(panel.plot, s , 
		{grid: {clickable:true,hoverable:false, autoHighlight:false, backgroundColor: 'white'}, 
		selection: {mode:"xy"},
		legend: {show:false, container:panel.legend, sorted:false},
		xaxis: {axisLabel: xpc},
		yaxis: {axisLabel: ypc}
		} 
	)
	panel.id2to1 = function(series,seriesindex) {
		return decode[series][seriesindex];
	}
	panel.id1to2 = function(index) {
		return recode[index];
	}
	var justselected=false;
	panel.plot.unbind("plotselected");
	panel.plot.bind("plotselected", function(event, ranges) {
		var choosen=new Array();
		var series = panel.flot.getData();
		for(s=0; s<series.length; s++) {
			var seriesdata = series[s].data;
			for(var i=0; i<seriesdata.length; i++) {
				if (seriesdata[i][0]>=ranges.xaxis.from & seriesdata[i][0]<=ranges.xaxis.to &
					seriesdata[i][1]>=ranges.yaxis.from & seriesdata[i][1]<=ranges.yaxis.to) {
					choosen.push(panel.id2to1(s,i));
				}
			}
		}
		allselect(choosen);
		panel.flot.clearSelection(true);
		justselected=true;
	})
	panel.plot.unbind("plotclick");
	panel.plot.bind("plotclick", function(event, pos, item) {
		if(item && !justselected) { 
			if(!shifted & !ctrled) {
				noneselect();
			}
			oneselect(panel.id2to1(item.seriesIndex, item.dataIndex));
			updateSelection();
			panel.flot.clearSelection(true);
		} else if (!justselected && !shifted && !ctrled) {
			allunselect();
		}
		justselected=false;
	})
}


function countselect() {
	return selids.length;
}
function noneselect() {
	selids = new Array();
}
function allunselect() {
	noneselect();
	updateSelection();
}


function allselect(indexes) {
	if (!shifted & !ctrled) {
		noneselect();
	}
	for(var i=0; i<indexes.length; i++) {
		oneselect(indexes[i]);
	}
	updateSelection();
}

function oneselect(idx) {
	if (!shifted & !ctrled) {
		selids.push(idx);
	} else {
		var pos = selids.indexOf(idx);
		if(shifted) { //add 
			if (pos == -1) {
				selids.push(idx)
			}
		} else if (ctrled) { //sub
			if(pos > -1) {
				selids.splice(pos,1)
			}
		}
	}
}

function updateSelection() {
	for (var p in controller.panels) {
		controller.panels[p].flot.unhighlight();
		for(var i=0; i < selids.length; i++) {
			var pair = controller.panels[p].id1to2(selids[i]);
			if(pair) {
				controller.panels[p].flot.highlight(pair[0], pair[1]);
			}
		}
	}
	var selcount = countselect(); 
	$("#selinfo").empty().text(selcount + " samples selected")
	if(selcount) {
		$("#selinfo").wrapInner($("<a>").attr("href","#").click(listSelected));
		if(selcount<2 && maindata.ID) {
			$("#selinfo").append(" (" + selids.map(function(x) {return maindata.ID[x]}).join(", ")+ ")");
		}
	};
}

function listSelected() {
	var newdoc = window.open(name="selectedids").document;
	for(var i=0; i<selids.length; i++) {
		newdoc.write(maindata.ID[selids[i]] +"<br/>");
	}
	return false;
}

function factor(vect, rlevels) {
   var levels = new Array();
   if(rlevels) {levels=rlevels}
   var obs = new Array();
   for(var i=0; i<vect.length; i++) {
		var idx = levels.indexOf(vect[i]);
		if(idx==-1) {
			obs.push(levels.push(vect[i])-1)
		} else {
			obs.push(idx)
		}
   }
   return {"obs":obs, "levels":levels};
}

function factorcounts (data, msg) {
	var cats;
	var counts;
	if(data.obs!=null & data.levels!=null) {
		cats = data.levels;
		counts = new Array(data.levels.length);
		for(var i=0; i<counts.length; i++) {
			counts[i]=0;
		}
		for(var i=0; i<data.obs.length; i++) {
			counts[data.obs[i]]++;
		}
	} else {
		cats = new Array();
		counts = new Array();
		for(var i=0; i<data.length; i++) {
			var idx = cats.indexOf(data[i]);
			if (idx==-1) {
				counts[cats.push(data[i])-1]=1;
			} else {
				counts[idx] +=1;
			}
		}
	}
	var pre="";
	if (msg) {pre=msg;}
	for(var i=0; i<cats.length; i++) {
		if(i) {msg +="; "}
		msg += cats[i] + ": " + counts[i]
	}
	return(msg)
}

function initdata(done) {
	$.ajax({
		url: "test.json",
		method: 'GET',
		dataType: 'json',
		error: function(xhr, ts, err) {
			alert(ts);
		},
		success: function(data) {
			setplotdata(data);
			if(done) {
				done();
			}
		}
	});
}

function setplotdata(data) {
	var contvars = Array();
	var catvars = Array();
	for(var name in data) {
		var i=0;
		//for(i=0; data[name][i] !== null ;i++) {}
		if (typeof data[name][i] === "string") {
			if(name != "ID") {
				catvars.push(name);
			}
		} else {
			contvars.push(name);
		}
	}
	plotvars["vars"] = contvars;
	plotvars["groups"] = catvars;
	maindata=data;
}

function initpanels() {
	if(window.location.search) {
		controller.setState(window.location.search.substr(1));
	}
	else if($.cookie("state")) {
		controller.setState($.cookie("state"));
	} else {
		controller.addPanel();
	}
	$("#addplot").click(controller.addPanel);
	$("#removeplot").click(controller.clickRemove);
	$("#sharestate").click(function() {
		$.cookie("state",controller.getState());
		window.location=controller.getState(true);
	//	alert(controller.getState(true))
	});
}

function addvalstoselect(box, vals, addblank) {
	if(addblank){
		box.append($('<option>').text(""));
	}
	$.each(vals, function(idx, val) {   
		box.append($('<option>').text(val)); 
	});
}

