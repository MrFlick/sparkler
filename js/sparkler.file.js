function handleFileDrop(evt) {
	evt.stopPropagation();
	evt.preventDefault();

	var files = evt.dataTransfer.files;
	console.log("drop")

	for(var i =0,f; f=files[i]; i++) {
	    var reader = new FileReader();
		reader.onloadend = function(e) {
			handleDataLoaded(parserawdata(reader.result));
		}
		reader.readAsText(f);
	}
}

function handleDataLoaded(data) {
	setplotdata(data);
	$(document).unbind("paste");
	var pc = $("#panelcontainer");
	pc.empty();
	ondataloaded();
}

function handleFileDrag(evt) {
	evt.stopPropagation();
	evt.preventDefault();
	evt.dataTransfer.dropEffect = 'copy';
}

function handleDataPaste(evt) {
	var e = evt.originalEvent;
	if(e.clipboardData) {
		var data = e.clipboardData.getData("text/plain");
		if (data) {
			handleDataLoaded(parserawdata(data));	
		} else {
			alert("Text data not found in paste. Found Types:" +
				e.clipboardData.types.join(","))
		}
	}
}


function initdataloadui() {
	var pc = $("#panelcontainer");
	var dropZone = $("<div/>", {class: "dropzone"});
	$(document).bind("paste",handleDataPaste); 
	var message = "";
	if (window.Clipboard) {
		message = "Drag Data File Here Or Paste Data Onto Page";
	} else {
		message = "Drag Data File Here";

	}
	dropZone.appendTo(pc);
	dropZone.text(message);
	dropZone[0].addEventListener('dragover', handleFileDrag, false);
	dropZone[0].addEventListener('drop', handleFileDrop, false);
}

function isnumeric(x) {return !isNaN(x)};
function trim(x) {return x.replace(/^\s\s*/,'').replace(/\s\s*$/, '');}

function parserawdata(data) {
	var lines = data.split(/\r\n?|\n/);
	var naStrings = [".", "NA"]
	var delim=null;
	var headers=null;
	var outdata = {};
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
			} else {
				delim = /\s+/g;
			}
		}
		var cols = line.split(delim).map(trim);
		if (headers == null) {
			headers = cols;
			for (var col in cols) {
				outdata[cols[col]] = [];
			}
			continue;
		}
		for(var col in cols) {
			var val = cols[col];
			if (naStrings.indexOf(val)>-1) val=null;
			val = isnumeric(val) ? Number(val) : val;
			outdata[headers[col]].push(val);
		}
	}
	return(outdata);
}




