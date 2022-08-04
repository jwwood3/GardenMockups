var map1 = null;
var map2 = null;
var table1 = null;
var table2 = null;
var infoBox1 = null;
var infoBox2 = null;
var viewModel = null;


/*
* Constructs a new query string from the current state of the page
* Maps in the default state and english language options are ignored
* This should potentially be in the model, but it needs to reference
*   the map objects which only exist in the view
*/
let constructQueryString = function(){
	var queryString = "?";
	let started = false;
	if(viewModel.model.LANG.LangId!='en'){
		started=true;
		queryString += "lang="+viewModel.model.LANG.LangId;
	}
	if(viewModel.model.hasChanged[0]){
		if(started){
			queryString+="&";
		}
		started=true;
		queryString+="lat1="+map1.getCenter()["lat"]+
					 "&lng1="+map1.getCenter()["lng"]+
					 "&zoom1="+map1.getZoom();
	}
	if(viewModel.model.hasChanged[1]){
		if(started){
			queryString+="&";
		}
		started=true;
		queryString+="lat2="+map2.getCenter()["lat"]+
					 "&lng2="+map2.getCenter()["lng"]+
					 "&zoom2="+map2.getZoom();
	}
	if(viewModel.selectedData["map1"]!=""){
		if(started){
			queryString+="&";
		}
		started=true;
		queryString+="map1="+viewModel.selectedData["map1"];
	}
	if(viewModel.selectedData["map2"]!=""){
		if(started){
			queryString+="&";
		}
		started=true;
		queryString+="map2="+viewModel.selectedData["map2"];
	}
	if(!started){
		return "";
	}
	return queryString;
}



document.addEventListener("DOMContentLoaded", function() {
	viewModel = new ViewModel();
	map1 = viewModel.createMap("map1");
	map2 = viewModel.createMap("map2");
	infoBox1 = viewModel.createInfoBox(map1);
	infoBox2 = viewModel.createInfoBox(map2);
	viewModel.createSearchBar(document.getElementById("searchBar1"));
	viewModel.createSearchBar(document.getElementById("searchBar2"));
	table1 = viewModel.createTable("table1", "table1Div");
	table2 = viewModel.createTable("table2", "table2Div");
	searchAddr1 = viewModel.createSearchAddress(map1, "addressSearch1");
	searchAddr2 = viewModel.createSearchAddress(map2, "addressSearch2");

	// View UI Listeners
	document.getElementById("searchBar1").addEventListener('keyup', function (event) {
		viewModel.handleSearchBar(event,1)
	});
	document.getElementById("search1").addEventListener('click', (event) => {
		var var1 = document.getElementById("searchBar1").value;
		if (var1 != "") {
			viewModel.changeToLoad(document.getElementById("search1"));
			viewModel.populateMap("map1", map1, infoBox1, var1).then((status) =>
				viewModel.changeBack(document.getElementById("search1"))|
				viewModel.populateLegend("map1", document.getElementById("legend1"))).then((status) =>
				viewModel.populateTable("map1", table1)).then((status) =>
				viewModel.endSearch(1)).then((status) =>
				viewModel.updateDetails(1));
		}
	});
	document.getElementById("searchBar2").addEventListener('keyup', function (event) {
		viewModel.handleSearchBar(event,2)
	});
   document.getElementById("search2").addEventListener('click', (event) => {
		var var2 = document.getElementById("searchBar2").value;
	   if (var2 != "") {
		   viewModel.changeToLoad(document.getElementById("search2"));
		   viewModel.populateMap("map2", map2, infoBox2, var2).then((status) =>
			    viewModel.changeBack(document.getElementById("search2")) |
			    viewModel.populateLegend("map2", document.getElementById("legend2"))).then((status) =>
				viewModel.populateTable("map2", table2)).then((status) =>
				viewModel.endSearch(2)).then((status) =>
				viewModel.updateDetails(2));
	   }
	});


	document.getElementById("DownloadButton1").addEventListener('click', function (event) {
		viewModel.loadExportModal("modal1");
	});
	document.getElementById("DownloadButton2").addEventListener('click', function (event) {
		viewModel.loadExportModal("modal2");
	});


	for( const el of document.getElementsByClassName("ShareButton")){
		el.addEventListener('click', (event) => {
			navigator.clipboard.writeText(window.location.href.split('?')[0]+constructQueryString());
		});
	}

	for( const el of document.getElementsByClassName("TableButton")){
		el.addEventListener('click', (event) => {
			if(event.target.parentNode.parentNode.id=="left"){
				viewModel.toggleView(1,1);
			} else {
				viewModel.toggleView(2,1);
			}
			map1.invalidateSize();
			map2.invalidateSize();
		});
	}

	for( const el of document.getElementsByClassName("LocButton")){
		el.addEventListener('click', (event) => {
			if(event.target.parentNode.parentNode.id=="left"){
				viewModel.toggleView(1,0);
			} else {
				viewModel.toggleView(2,0);
			}
			map1.invalidateSize();
			map2.invalidateSize();
		});
	}

	for( const el of document.getElementsByClassName("GraphButton")){
		el.addEventListener('click', (event) => {
			if(event.target.parentNode.parentNode.id=="left"){
				viewModel.toggleView(1,2);
			} else {
				viewModel.toggleView(2,2);
			}
			map1.invalidateSize();
			map2.invalidateSize();
		});
	}

	for( const el of document.getElementsByClassName("selectButton")){
		el.addEventListener('click', (event) => {
			if(event.target.parentNode.parentNode.id=="left"){
				viewModel.openQueryPanel(1);
			} else {
				viewModel.openQueryPanel(2);
			}
			map1.invalidateSize();
			map2.invalidateSize();
		});
	}

	for( const el of document.getElementsByClassName("XButton")){
		el.addEventListener('click', (event) => {
			let newMaps;
			if(event.target.parentNode.parentNode.id=="left"){
				newMaps = viewModel.closeQueryPanel(1,map1,map2);
				if(newMaps==undefined){

				} else if(newMaps["map1"]){
					map1 = newMaps["map1"];
					infoBox1 = newMaps["box1"];
					map1.addEventListener('moveend', () => {
						viewModel.model.hasChanged[0] = true;
						if(viewModel.model.isLinked){
							viewModel.model.hasChanged[1] = true;
						}
						viewModel.syncMaps(map2,map1);
					});
					let KEY = document.getElementById("key1");
					while(KEY.children.length>1){
						KEY.lastChild.remove();
					}
					let LEG = document.getElementById("legend1");
					while(LEG.children.length>0){
						LEG.firstChild.remove();
					}
				}
			} else {
				newMaps = viewModel.closeQueryPanel(2,map1,map2);
				if(newMaps["map2"]){
					map2 = newMaps["map2"];
					infoBox2 = newMaps["box2"];
					map2.addEventListener('moveend', () => {
						viewModel.model.hasChanged[1] = true;
						if(viewModel.model.isLinked){
							viewModel.model.hasChanged[0] = true;
						}
						viewModel.syncMaps(map1,map2);
					});
					let KEY = document.getElementById("key2");
					while(KEY.children.length>1){
						KEY.lastChild.remove();
					}
					let LEG = document.getElementById("legend2");
					while(LEG.children.length>0){
						LEG.firstChild.remove();
					}
				}

			}
			map1.invalidateSize();
			map2.invalidateSize();
		});
	}

	for( const el of document.getElementsByClassName("QButton")){
		el.addEventListener('click', (event) => {
			let newPanel = null;
			if(event.target.parentNode.parentNode.id=="left"){
				newPanel = viewModel.createInfoPanel("left");
			} else {
				newPanel = viewModel.createInfoPanel("right");
			}
			map1.invalidateSize();
			map2.invalidateSize();
		});
	}

	for( const el of document.getElementsByClassName("aboutData")){
		el.addEventListener('click', (event) => {
			let newPanel = null;
			if(event.target.parentNode.parentNode.id=="left"){
				newPanel = viewModel.createInfoPanel("left");
			} else {
				newPanel = viewModel.createInfoPanel("right");
			}
			map1.invalidateSize();
			map2.invalidateSize();
		});
	}

	for( const el of document.getElementsByClassName("expandButton")){
		el.addEventListener('click', (event) => {
			let newPanel = null;
			if(event.target.getAttribute("src")=="expand.png"){
				event.target.setAttribute("src","retract.png");
				event.target.parentNode.classList.add("full");
			} else {
				event.target.setAttribute("src","expand.png");
				event.target.parentNode.classList.remove("full");
			}
			map1.invalidateSize();
			map2.invalidateSize();
		});
	}

	for( const el of document.getElementsByClassName("legendLabel")){
		el.addEventListener('click', (event) => {
			if(event.target.innerHTML==viewModel.model.LANG.LEGENDLABEL+": &gt;&gt;"){
				event.target.innerHTML=viewModel.model.LANG.LEGENDLABEL+": <<";
				event.target.parentNode.parentNode.classList.add("open");
			}
			else {
				event.target.innerHTML=viewModel.model.LANG.LEGENDLABEL+": >>";
				event.target.parentNode.parentNode.classList.remove("open");
			}
		});
		el.addEventListener('dblclick', (event) => {
			console.log("double clicked");
			event.stopImmediatePropagation();
			event.preventDefault();
		});
	}

	document.getElementById("rightMapArrow").addEventListener('click', (event) => {
		console.log("clicked right map arrow");
		viewModel.toggleMap(2);
		map1.invalidateSize();
		map2.invalidateSize();
	});

	document.getElementById("leftMapArrow").addEventListener('click', (event) => {
		console.log("clicked left map arrow");
		viewModel.toggleMap(1);
		map1.invalidateSize();
		map2.invalidateSize();
	});


	document.getElementById("linkMapButton").addEventListener('click', (event) => {
		viewModel.toggleSync();
	});

	map1.addEventListener('moveend', () => {
		viewModel.model.hasChanged[0] = true;
		if(viewModel.model.isLinked){
			viewModel.model.hasChanged[1] = true;
		}
		viewModel.syncMaps(map2,map1);
	});

	map2.addEventListener('moveend', () => {
		viewModel.model.hasChanged[1] = true;
		if(viewModel.model.isLinked){
			viewModel.model.hasChanged[0] = true;
		}
		viewModel.syncMaps(map1,map2);
	});

	window.addEventListener('resize', () => {
		viewModel.resize();
	});

	document.getElementById("topicSel1").addEventListener("change", async function(e){
		await viewModel.handleTopicMenu(e,1);
	})
	document.getElementById("contSel1").addEventListener("change", async function(e){
		await viewModel.contUpdate(e,1);
	})
	document.getElementById("mediumSel1").addEventListener("change", async function(e){
		await viewModel.mediumUpdate(e,1);
	})
	document.getElementById("measureSel1").addEventListener("change", async function(e){
		await viewModel.handleMeasureMenu(e,1);
	})
	document.getElementById("topicSel2").addEventListener("change", async function(e){
		await viewModel.handleTopicMenu(e,2);
	})
	document.getElementById("contSel2").addEventListener("change", async function(e){
		await viewModel.contUpdate(e,2);
	})
	document.getElementById("mediumSel2").addEventListener("change", async function(e){
		await viewModel.mediumUpdate(e,2);
	})
	document.getElementById("measureSel2").addEventListener("change", async function(e){
		await viewModel.handleMeasureMenu(e,2);
	})


	let langSelector = document.getElementById("langSelect");

	for(var opt of Object.values(viewModel.model.LANGS)) {
		var el = document.createElement("option");
		el.textContent = opt.LangName;
		el.setAttribute('data-LangId',opt.LangId);
		langSelector.appendChild(el);
	}
	if("lang" in viewModel.queryFlags){
		for(var i=0;i<langSelector.options.length;i++){
			if(langSelector.options[i].getAttribute('data-LangId')==viewModel.queryFlags["lang"]){
				langSelector.selectedIndex=i;
				break;
			}
		}
	}
	langSelector.addEventListener('change',(e) => {
		viewModel.model.LANG = viewModel.model.LANGS[e.target.options[e.target.selectedIndex].getAttribute('data-LangId')];
		window.location.href=window.location.href.split('?')[0]+constructQueryString();
	});

	{// Edit plain text in index.html fields
		for(s of document.getElementsByClassName("searchBar")){
			s.setAttribute("placeholder",viewModel.model.LANG.VARIABLE_SEARCH);
		}
		for(s of document.getElementsByClassName("addressSearch")){
			s.setAttribute("placeholder",viewModel.model.LANG.ADDRESS_SEARCH);
		}
		for(s of document.getElementsByClassName("aboutData")){
			s.innerHTML = viewModel.model.LANG.ABOUT_DATA;
		}
		for(s of document.getElementsByClassName("selectButton")){
			s.innerHTML = viewModel.model.LANG.SELECT_DATA;
		}
		for(s of document.getElementsByClassName("legendLabel")){
			s.innerHTML = viewModel.model.LANG.LEGENDLABEL+": >>";
		}
		for(s of document.getElementsByClassName("querySubmit")){
			s.value = viewModel.model.LANG.SEARCH;
		}
		document.getElementById("search1").innerHTML = viewModel.model.LANG.SEARCH;
		document.getElementById("search2").innerHTML = viewModel.model.LANG.SEARCH;
		document.title = viewModel.model.LANG.TITLE;
	}

	// I need to access the tables, but I'm not sure if I can directly edit any of that code, so this is going here temporarily
	{
		// Make table wrappers sizeable
		let tableWrappers = document.getElementsByClassName("dataTables_wrapper");
		for(var i=0;i<tableWrappers.length;i++){
			tableWrappers[i].classList.add("sizeable");
		}
	}

	viewModel.resize();
	map1.invalidateSize();
	map2.invalidateSize();
	viewModel.model.hasChanged=[false,false];
	if("lat1" in viewModel.queryFlags && "lng1" in viewModel.queryFlags && "zoom1" in viewModel.queryFlags){
		viewModel.model.hasChanged[0] = true;
		map1.setView({lat: viewModel.queryFlags["lat1"], lng: viewModel.queryFlags["lng1"]},viewModel.queryFlags["zoom1"]);
	}
	if("lat2" in viewModel.queryFlags && "lng2" in viewModel.queryFlags && "zoom2" in viewModel.queryFlags){
		viewModel.model.hasChanged[1] = true;
		map2.setView({lat: viewModel.queryFlags["lat2"], lng: viewModel.queryFlags["lng2"]},viewModel.queryFlags["zoom2"]);
	}

	document.getElementById('tempElement').addEventListener('fetched',(event) => { // This fires once variables are fetched in viewModel constructor
		console.log("Data successfully fetched");
		// initial background DB query
		viewModel.fetchVariable("map1", " (cadmium)"); // I moved this in here to occur only after the variables have been fetched. Otherwise it seems to fail - JW
		if("map1" in viewModel.queryFlags){// need to wait until fetch variables is done
			document.getElementById("searchBar1").value = viewModel.queryFlags["map1"];
			viewModel.changeToLoad(document.getElementById("search1"));
			viewModel.populateMap("map1", map1, infoBox1, viewModel.queryFlags["map1"]).then((status) =>
				viewModel.changeBack(document.getElementById("search1"))|
				viewModel.populateLegend("map1", document.getElementById("legend1"))).then((status) =>
				viewModel.populateTable("map1", table1)).then((status) =>
				viewModel.endSearch(1)).then((status) =>
				viewModel.updateDetails(1));
		}
		if("map2" in viewModel.queryFlags){
			document.getElementById("searchBar2").value = viewModel.queryFlags["map2"];
			viewModel.changeToLoad(document.getElementById("search2"));
			viewModel.populateMap("map2", map2, infoBox2, viewModel.queryFlags["map2"]).then((status) =>
				viewModel.changeBack(document.getElementById("search2"))|
				viewModel.populateLegend("map2", document.getElementById("legend2"))).then((status) =>
				viewModel.populateTable("map2", table2)).then((status) =>
				viewModel.endSearch(2)).then((status) =>
				viewModel.updateDetails(2));
		}
	});

/*var centerDragHandler = d3.drag()
    .on('drag', centerDragged)
	.on('end', function(){map1.invalidateSize();map2.invalidateSize()})


var d3Center = d3.select("#spacerDiv")

centerDragHandler(d3Center);


function centerDragged() {
	var x = d3.event.x
	if(x<0){x=0}else if(x>viewModel.screenWidth){x=viewModel.screenWidth}
	document.getElementById("left").style.flexGrow=x/viewModel.screenWidth
	document.getElementById("left").style.flexShrink=x/viewModel.screenWidth
	document.getElementById("right").style.flexGrow=(viewModel.screenWidth-x)/viewModel.screenWidth
	document.getElementById("right").style.flexShrink=(viewModel.screenWidth-x)/viewModel.screenWidth
	console.log(d3.event.x+", "+d3.event.y)
}*/
});
