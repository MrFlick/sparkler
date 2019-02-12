var sparkler = sparkler || {};
sparkler.util = sparkler.util || {};

sparkler.util.getColors = function(n, base) {
	// "borrowed" from the flot library
	n = n || 1;
	base = base || ["#edc240", "#afd8f8", "#cb4b4b", "#4da74d", "#9440ed"];
	var i,c, variation = 0;
	var colors = new Array(n);
	for(var i=0; i<n; i++) {

		c = $.color.parse(base[i % base.length] || "#666"); 

		if (i % base.length ==0 && i) {
			if(variation >= 0) {
				if(variation < 0.5) {
					variation = -variation - 0.2;
				} else {
					variation = 0;
				}
			} else {
				variation = -variation;
			}
		}

		colors[i] = c.scale('rgb', 1+variation).toString();
	}
	return(colors);
}

//helper functions
sparkler.util.isnumeric = function(x) {return !isNaN(x)};
sparkler.util.trim = function(x) {return x.replace(/^\s\s*/,'').replace(/\s\s*$/, '')};

//data classes
(function() {
	var ContinuousVar = function(x) {
		this.data = x;
	}
	ContinuousVar.prototype.getValue = function(x) {
		return this.data[x];
	}
	ContinuousVar.prototype.isCateogrical = function() {return false;}
	ContinuousVar.prototype.getLength = function() {return this.data.length;}

	var CategoricalVar = function(x, levels) {
	   this.levels = [];
	   if(levels) {this.levels=levels}
	   this.data = [];
	   for(var i=0; i<x.length; i++) {
			var idx = this.levels.indexOf(x[i]);
			if(idx==-1) {
				this.data.push(this.levels.push(x[i])-1)
			} else {
				this.data.push(idx)
			}
	   }
	}

	CategoricalVar.prototype.getValue = function(x) {
		return this.levels[this.data[x]];	
	}
	CategoricalVar.prototype.getGroup = function(x) {
		return this.data[x];
	}
	CategoricalVar.prototype.groups = function(x) {
		return this.levels;
	}
	CategoricalVar.prototype.isCateogrical = function() {return true;}
	CategoricalVar.prototype.getLength = function() {return this.data.length;}
	sparkler.util.ContinuousVar = ContinuousVar;
	sparkler.util.CategoricalVar = CategoricalVar;
})();


//plot helpder
sparkler.util.kde = function(values,bins) {
	//kernel density estimator
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

sparkler.util.modal = (function(){
	//from http://www.jacklmoore.com/notes/jquery-modal-tutorial
	var 
	method = {},
	$overlay,
	$modal,
	$content,
	$close;

	// Center the modal in the viewport
	method.center = function () {
		var top, left;

		top = Math.max($(window).height() - $modal.outerHeight(), 0) / 2;
		left = Math.max($(window).width() - $modal.outerWidth(), 0) / 2;

		$modal.css({
			top:top + $(window).scrollTop(), 
			left:left + $(window).scrollLeft()
		});
	};

	// Open the modal
	method.open = function (settings) {
		$content.empty().append(settings.content);

		$modal.css({
			width: settings.width || 'auto', 
			height: settings.height || 'auto'
		});

		method.center();
		$(window).bind('resize.modal', method.center);
		$modal.show();
		$overlay.show();
	};

	// Close the modal
	method.close = function () {
		$modal.hide();
		$overlay.hide();
		$content.empty();
		$(window).unbind('resize.modal');
	};

	// Generate the HTML and add it to the document
	$overlay = $('<div id="modal-overlay"></div>');
	$modal = $('<div id="modal"></div>');
	$content = $('<div id="modal-content"></div>');
	$close = $('<a id="modal-close" href="#">close</a>');

	$modal.hide();
	$overlay.hide();
	$modal.append($content, $close);

	$(document).ready(function(){
		$('body').append($overlay, $modal);						
	});

	$close.click(function(e){
		e.preventDefault();
		method.close();
	});

	return method;
}());
