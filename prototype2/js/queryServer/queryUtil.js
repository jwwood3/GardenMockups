var fs = require('fs')
var $rdf = require('rdflib');
var express = require('express');
var request = require('request');
var cors = require('cors');
var app = express();
var sortBy = require('sort-by');

// define the port
var port = Number(process.env.PORT || 3000);

// create the graph store object
var store=$rdf.graph();

var rdfData=fs.readFileSync('srpdio.owl').toString();

var contentType='application/rdf+xml';
var baseUrl="http://purl.obolibrary.org/obo/srpdio.owl#";
var rdfsSubClassOf = $rdf.sym('http://www.w3.org/2000/01/rdf-schema#subClassOf')
var rdfsLabel = $rdf.sym('http://www.w3.org/2000/01/rdf-schema#label')
var definitionLabel = $rdf.sym('http://purl.obolibrary.org/obo/IAO_0000115')
var intersectionOf = $rdf.sym('http://www.w3.org/2002/07/owl#intersectionOf')
var equivalentClass = $rdf.sym('http://www.w3.org/2002/07/owl#equivalentClass')
var onProperty = $rdf.sym("http://www.w3.org/2002/07/owl#onProperty")
var someValuesFrom = $rdf.sym('http://www.w3.org/2002/07/owl#someValuesFrom')
var inheresIn = $rdf.sym("http://purl.obolibrary.org/obo/RO_0000052")
var partOf = $rdf.sym("http://purl.obolibrary.org/obo/BFO_0000050")
var acsVarId = $rdf.sym("http://purl.obolibrary.org/obo/SRPDIO_4000006")
var ejsVarId = $rdf.sym("http://purl.obolibrary.org/obo/SRPDIO_4000005")

var PREF = "http://purl.obolibrary.org/obo/"

var count = 1;

var validDataIds = {}
var validOntologyIds = {}
var validContaminants = {"aluminum":[]}
var validMedia = {"water":[]}

var DATABASE_VARS = []

$rdf.parse(rdfData,store,baseUrl,contentType);

var calls = 0

async function fetchValidData(){
	const response = await fetch("https://src.cals.arizona.edu/api/v1/scrutinizer/variables");
	const variables = await response.json();
	DATABASE_VARS = variables;
	validDataIds = {}
	for (let i=0; i<variables.length; i++) {
		var acsVars = store.statementsMatching(undefined,acsVarId,variables[i].name)
		if(acsVars.length>0){// Try to search as an ACS variable
			validDataIds[variables[i].name] = acsVars[0].subject.uri
			validOntologyIds[acsVars[0].subject.uri] = variables[i].name
		} else {
			var ejsVars = store.statementsMatching(undefined,ejsVarId,variables[i].name)
			if(ejsVars.length>0){// Try to search as an EJS variable
				validDataIds[variables[i].name] = ejsVars[0].subject.uri
				validOntologyIds[ejsVars[0].subject.uri] = variables[i].name
			}
		}
	}
	console.log("ACS/EJS Data fetched")
	await fetchConcData();
}

async function fetchConcData(){
	for(var i=0;i<DATABASE_VARS.length;i++){
		var variable = DATABASE_VARS[i]
		//console.log(""+i+"/"+DATABASE_VARS.length+" : "+(i/DATABASE_VARS.length)+"\t-\t"+variable.name)
		if(validDataIds.hasOwnProperty(variable.name)){
			continue
		}
		const response = await fetch("https://src.cals.arizona.edu/api/v1/scrutinizer/measurements?variable="+variable.name);
		const data = await response.json();
		if(data.length>0 && data[0].medium && data[0].medium.toLowerCase()!="population"){// Try to parse as contaminant data
			if(!validContaminants.hasOwnProperty(variable.name)){
				validContaminants[variable.name] = []
			}
			for(var row of data){
				if(!validContaminants[variable.name].includes(row.medium)){
					validContaminants[variable.name].push(row.medium)
				}
				if(!validMedia.hasOwnProperty(row.medium)){
					validMedia[row.medium]=[]
				}
				if(!validMedia[row.medium].includes(variable.name)){
					validMedia[row.medium].push(variable.name)
				}
			}
		}
	}
}

function getValidVariables(){
	return validDataIds
}

function getDatabaseNames(){
	return validOntologyIds
}

function getValidSubs(iri){
	if(!iri.startsWith(PREF)){
		iri = PREF+iri
	}
	var full = getSubs(iri)
	var retList = []
	for(var i of full){
		if(i.uri in validOntologyIds){
			retList.push(i)
		}
	}
	return retList
}

function getSubs(iri){
	if(!iri.startsWith(PREF)){
		iri = PREF+iri
	}
	var retList = []
	var checked = []
	var subs = []
	var subList = store.statementsMatching(undefined,rdfsSubClassOf,$rdf.sym(iri))
	for(var i of subList){
		subs.push(i.subject)
		checked.push(i.subject.uri)
	}
	while(subs.length>0){
		subList = store.statementsMatching(undefined,rdfsSubClassOf,subs[0])
		retList.push(subs[0])
		subs.splice(0,1)
		for(var i of subList){
			if(!(i.subject.uri in checked)){
				subs.push(i.subject)
				checked.push(i.subject.uri)
			}
		}
		console.log("Still Checking for subs of "+iri)
	}
	return retList
}

function PrintStore(store,root="",indents=0){
	var rootNode = $rdf.sym(root);
	var triples = store.statementsMatching(undefined, rdfsSubClassOf, rootNode);
	var indentString = "";
	for(var i=0;i<indents;i++){
		indentString = indentString + "\t";
	}
	console.log(indentString + store.statmentsMatching());
}

function getLabel(obj){
	var pref = "http://purl.obolibrary.org/obo/"
	if(typeof obj === 'string' || obj instanceof String){
		if(obj.indexOf(pref)>=0){
			obj = $rdf.sym(obj)
		} else {
			return obj
		}
	}
	var label = store.anyStatementMatching(obj, rdfsLabel, undefined)
	if(label==undefined){
		label = obj.uri
	} else {
		label = label.object.value
	}
	return label
}

function printNode(node,html=false){
	var pref = "http://purl.obolibrary.org/obo/"
	if(typeof node === 'string' || node instanceof String){
		if(node.indexOf(pref)>=0){
			node = $rdf.sym(node)
		} else {
			return node
		}
	}
	if(node.termType && node.termType=="BlankNode"){
		return "Blank "+node.value
	} else if(node.termType && node.termType=="NamedNode"){
		var lab = getLabel(node)
		if(node.uri.replace(pref,"")==lab){
			if(html){
				return "<span style=\"font-style:italic\">"+lab+"</span>"
			}
			return lab
		}
		if(html){
			return "<span style=\"font-style:italic\">"+node.uri.replace(pref,"")+" </span><span style=\"color:green\">("+getLabel(node)+")</span>"
		} else {
			return node.uri.replace(pref,"")+" ("+getLabel(node)+")"
		}
	} else if(node.termType && node.termType=="Literal"){
		return node.value
	} else if(node.termType && node.termType=="Collection"){
		ret = "{"
		for(el of node.elements){
			ret = ret + printNode(el) + ","
		}
		ret = ret+"}"
		return ret
	}
}

var conToMed = {}
var medToCon = {}
var concDataCsv = {"contaminants":[],"media":[]}

var getConcDataOntology = function(restrict = true){
	var contIDs = []
	var mediumIDs = []
	var concData = {"contaminants":[],"media":[]}
	var pref = "http://purl.obolibrary.org/obo/"
	if(restrict && concDataCsv.contaminants.length==0){
		if(concDataCsv.length>0){
			return concDataCsv
		}
		var csvText = fs.readFileSync('./queryServer/concData.csv','utf8').toString()
		var csvRows = csvText.split("\n")
		for(var i=1;i<csvRows.length;i++){
			var row = csvRows[i]
			var rowSplit = row.split(",")
			if(rowSplit.length>1){
				if(conToMed[pref+rowSplit[0]] && conToMed[pref+rowSplit[0]].indexOf(pref+rowSplit[1])<0){
					conToMed[pref+rowSplit[0]].push(pref+rowSplit[1])
				} else if(!conToMed[pref+rowSplit[0]]){
					conToMed[pref+rowSplit[0]] = [pref+rowSplit[1]]
				}
				if(medToCon[pref+rowSplit[1]] && medToCon[pref+rowSplit[1]].indexOf(pref+rowSplit[0])<0){
					medToCon[pref+rowSplit[1]].push(pref+rowSplit[0])
				} else if(medToCon[pref+rowSplit[1]]==undefined){
					medToCon[pref+rowSplit[1]] = [pref+rowSplit[0]]
				}
				if(contIDs.indexOf(pref+rowSplit[0])<0){
					concDataCsv.contaminants.push($rdf.sym(pref+rowSplit[0]))
					contIDs.push(pref+rowSplit[0])
				}
				if(mediumIDs.indexOf(pref+rowSplit[1])<0){
					concDataCsv.media.push($rdf.sym(pref+rowSplit[1]))
					mediumIDs.push(pref+rowSplit[1])
				}
			}
		}

	}
	if(!restrict){
		var triples = store.statementsMatching(undefined, equivalentClass, undefined)
		for(triple of triples){
			if(!(triple.subject && triple.subject.uri.indexOf("SRPDIO")>=0)){
				continue
			}
			var midTriples = store.statementsMatching(triple.object, intersectionOf, undefined)
			for(midTriple of midTriples){
				if(midTriple.object && midTriple.object.termType=="Collection" && midTriple.object.elements[0].uri.endsWith("PATO_0000033")){
					var blank1 = midTriple.object.elements[1]
					var tripleCheck = store.statementsMatching(blank1, onProperty, inheresIn)
					if(tripleCheck.length == 0){
						continue
					}
					var triples2 = store.statementsMatching(blank1, someValuesFrom, undefined)
					for (triple2 of triples2){
						var blank2 = triple2.object
						if(blank2){
							var triples3 = store.statementsMatching(blank2, intersectionOf, undefined)
							for (triple3 of triples3){
								if(triple3.object && triple3.object.termType=="Collection" && triple3.object.elements.length==2){
									var contaminant = triple3.object.elements[0]
									if(!contIDs.includes(contaminant.uri) && contaminant.uri.indexOf("CHEBI_24431")<0){
										contIDs.push(contaminant.uri)
										concData.contaminants.push(contaminant)
									}
									var blank3 = triple3.object.elements[1]
									var tripleCheck2 = store.statementsMatching(blank3, onProperty, partOf)
									if(tripleCheck2.length == 0){
										continue
									}
									var triples4 = store.statementsMatching(blank3, someValuesFrom, undefined)
									for (triple4 of triples4){
										var medium = triple4.object
										if(!mediumIDs.includes(medium.uri) && medium.uri.indexOf("ENVO_00010483")<0){
											mediumIDs.push(medium.uri)
											concData.media.push(medium)
										}
									}
								}
							}
						}
					}
				}
			}
		}
	} else {
		concData = concDataCsv
	}
	concData.contLabels = []
	concData.medLabels = []
	for(var i = 0;i<concData.contaminants.length;i++){
		var con = concData.contaminants[i]
		concData.contLabels.push(printNode(con))
	}
	for(var i = 0;i<concData.media.length;i++){
		var med = concData.media[i]
		concData.medLabels.push(printNode(med))
	}
	return concData
}

var getValidContaminantsForMediumOntology = function(valMedium,restrict=true){
	if(typeof valMedium == "string"){
		if(valMedium.indexOf("http")<0){
			valMedium = "http://purl.obolibrary.org/obo/"+valMedium
		}
		valMedium = $rdf.sym(valMedium)
	}
	var contIDs = []
	var contaminants = []
	var pref = "http://purl.obolibrary.org/obo/"
	var triples = store.statementsMatching(undefined, equivalentClass, undefined)
	for(triple of triples){
		if(!(triple.subject && triple.subject.uri.indexOf("SRPDIO")>=0)){
			continue
		}
		var midTriples = store.statementsMatching(triple.object, intersectionOf, undefined)
		for(midTriple of midTriples){
			if(midTriple.object && midTriple.object.termType=="Collection" && midTriple.object.elements[0].uri.endsWith("PATO_0000033")){
				var blank1 = midTriple.object.elements[1]
				var tripleCheck = store.statementsMatching(blank1, onProperty, inheresIn)
				if(tripleCheck.length == 0){
					continue
				}
				var triples2 = store.statementsMatching(blank1, someValuesFrom, undefined)
				for (triple2 of triples2){
					var blank2 = triple2.object
					if(blank2){
						var triples3 = store.statementsMatching(blank2, intersectionOf, undefined)
						for (triple3 of triples3){
							if(triple3.object && triple3.object.termType=="Collection" && triple3.object.elements.length==2){
								var contaminant = triple3.object.elements[0]
								var blank3 = triple3.object.elements[1]
								var tripleCheck2 = store.statementsMatching(blank3, onProperty, partOf)
								if(tripleCheck2.length == 0){
									continue
								}
								var triples4 = store.statementsMatching(blank3, someValuesFrom, undefined)
								for (triple4 of triples4){
									var medium = triple4.object
									if(medium && medium.uri==valMedium.uri){
										if(!contIDs.includes(contaminant.uri) && contaminant.uri.indexOf("CHEBI_24431")<0){
											contIDs.push(contaminant.uri)
											contaminants.push(contaminant)
										}
									}
								}
							}
						}
					}
				}
			}
		}
	}
	if(restrict && concDataCsv.contaminants.length>0){
		contaminants = medToCon[valMedium.uri]
		for(var i=0;i<contaminants.length;i++){
			contaminants[i] = $rdf.sym(contaminants[i])
		}
	}
	return contaminants
}

var getValidMediaForContaminantOntology = function(valCont, restrict=true){
	if(typeof valCont == "string"){
		if(valCont.indexOf("http")<0){
			valCont = "http://purl.obolibrary.org/obo/"+valCont
		}
		valCont = $rdf.sym(valCont)
	}
	var mediumIDs = []
	var media = []
	var pref = "http://purl.obolibrary.org/obo/"
	var triples = store.statementsMatching(undefined, equivalentClass, undefined)
	for(triple of triples){
		if(!(triple.subject && triple.subject.uri.indexOf("SRPDIO")>=0)){
			continue
		}
		var midTriples = store.statementsMatching(triple.object, intersectionOf, undefined)
		for(midTriple of midTriples){
			if(midTriple.object && midTriple.object.termType=="Collection" && midTriple.object.elements[0].uri.endsWith("PATO_0000033")){
				var blank1 = midTriple.object.elements[1]
				var tripleCheck = store.statementsMatching(blank1, onProperty, inheresIn)
				if(tripleCheck.length == 0){
					continue
				}
				var triples2 = store.statementsMatching(blank1, someValuesFrom, undefined)
				for (triple2 of triples2){
					var blank2 = triple2.object
					if(blank2){
						var triples3 = store.statementsMatching(blank2, intersectionOf, undefined)
						for (triple3 of triples3){
							if(triple3.object && triple3.object.termType=="Collection" && triple3.object.elements.length==2){
								var contaminant = triple3.object.elements[0]
								if(!(contaminant && contaminant.uri==valCont.uri)){
									continue
								}
								var blank3 = triple3.object.elements[1]
								var tripleCheck2 = store.statementsMatching(blank3, onProperty, partOf)
								if(tripleCheck2.length == 0){
									continue
								}
								var triples4 = store.statementsMatching(blank3, someValuesFrom, undefined)
								for (triple4 of triples4){
									var medium = triple4.object
									if(medium && !mediumIDs.includes(medium.uri) && medium.uri.indexOf("ENVO_00010483")<0){
										mediumIDs.push(medium.uri)
										media.push(medium)
									}
								}
							}
						}
					}
				}
			}
		}
	}
	if(restrict && concDataCsv.media.length>0){
		media = conToMed[valCont.uri]
		for(var i =0;i<media.length;i++){
			media[i] = $rdf.sym(media[i])
		}
	}
	return media
}

function getValidContaminantsByMedium(){
	return validMedia;
}

function getValidMediaByContaminant(){
	return validContaminants;
}


function query(sub,pred,obj){
	var pref = "http://purl.obolibrary.org/obo/"
	var ret = "<!DOCTYPE html>\n<html>\n<head>\n<title>Query</title>\n</head>\n<body>\n"
	if(sub!=undefined){
		sub = $rdf.sym(pref+sub)
	}
	if(pred!=undefined){
		pred = $rdf.sym(pref+pred)
	}
	if(obj!=undefined){
		obj = $rdf.sym(pref+obj)
	}
	var triples = store.statementsMatching(sub,pred,obj)
	if(triples.length==0){
		return 0
	}
	for(triple of triples){
		ret = ret + "<p>"+printNode(triple.subject) + " " + printNode(triple.predicate) + " " + printNode(triple.object) + "</p><br>\n"
	}
	return ret + "</body></html>"
	return 0
}

function getRelationships(iri){
	var pref = "http://purl.obolibrary.org/obo/"
	var toKeep = ["Collection","BlankNode"]
	if(iri.indexOf("http")<0){
		iri = pref+iri
	}
	var toCheck = [$rdf.sym(iri)]
	var checked = []
	var retString = "<!DOCTYPE html>\n<html>\n<head>\n<title>Relationships</title>\n</head>\n<body>\n"
	while(toCheck.length!=0){
		var current = toCheck.pop()
		if(checked.includes(current.value)){
			continue
		}
		checked.push(current.value)
		if(current.termType=="Collection"){
			for(el of current.elements){
				if(!checked.includes(el.value) && toKeep.includes(el.termType)){
					toCheck.push(el)
				}
			}
			continue
		} else if(current.termType=="Literal"){
			continue
		}
		retString = retString + "<h1>"+printNode(current)+"</h1>\n"
		var triples = store.statementsMatching(undefined, current, undefined)
		triples = triples.concat(store.statementsMatching(current, undefined, undefined))
		triples = triples.concat(store.statementsMatching(undefined, undefined, current))
		for(triple of triples){
			if(triple==undefined){
				continue
			}
			if(!checked.includes(triple.subject.value) && toKeep.includes(triple.subject.termType)){
				toCheck.push(triple.subject)
			}
			if(!checked.includes(triple.predicate.value) && toKeep.includes(triple.predicate.termType)){
				toCheck.push(triple.predicate)
			}
			if(!checked.includes(triple.object.value) && toKeep.includes(triple.object.termType)){
				toCheck.push(triple.object)
			}
			var sub = printNode(triple.subject,true)
			var pred = printNode(triple.predicate,true)
			var obj = printNode(triple.object,true)
			retString = retString + "<p>"+sub + " - <span style=\"color:red\">" + pred + "</span> - " + obj+"</p>\n"
		}
	}
	return retString+"</body>\n</html>"
}

function countFilters(){
	let isAbout = $rdf.sym('http://purl.obolibrary.org/obo/IAO_0000136')
	var descriptions = []
	var filters = []
	var counts = []
	var allTriples = store.statementsMatching(undefined, onProperty,isAbout);
	for(stat of allTriples){
		var orig = store.statementsMatching(undefined, rdfsSubClassOf, stat.subject);
		var allFilters = store.statementsMatching(stat.subject, someValuesFrom, undefined);
		for(filter of allFilters){
			if(orig.length>0 && orig[0].subject.uri.includes("SRPDIO")){
				if(filters.indexOf(filter.object.uri)==-1){
					filters.push(filter.object.uri);
					descriptions.push(store.anyStatementMatching(filter.object, rdfsLabel, undefined).object);
					counts.push(0);
				}
				counts[filters.indexOf(filter.object.uri)]++;
			}
		}
	}
	var countStr = "Count"
	var URIStr = "URI"
	var descStr = "Description"
	exportString = countStr+","+URIStr+","+descStr+"\n";
	for(var i=0;i<filters.length;i++){
		console.log(counts[i]+"\t"+filters[i]+"\t"+descriptions[i])
		exportString = exportString + "\""+counts[i]+"\",\""+""+filters[i]+"\",\""+descriptions[i]+"\"\n";
	}
	fs.writeFile("counts.csv",exportString,function(err) {
		if (err) {
			console.log("error writing file: " + err)
		}
	});
}

/*
Finds the ontology term for the concentration of the given chemical in the given material
SELECT ?var
WHERE {
	?var subclassOf ?a
	?a onProperty inheresIn
	?a someValuesFrom ?b
	?b intersectionOf ?c
	?c is a container that contains CHEMICALIRI // bad syntax
	?c is a container that contains ?d          // informal
	?d onProperty partOf
	?d someValuesFrom MATERIALIRI
}
*/
let findConcentrationVariable = function(chemicalIRI, materialIRI){
	let totalStore = {}
	let concentrationOfs = store.statementsMatching(undefined,onProperty,inheresIn);
	for(const stat of concentrationOfs){
		let totalStore = store.statementsMatching(stat.subject,someValuesFrom,undefined)
		for(const inh of totalStore){
			let tempStore = store.statementsMatching(inh.object,intersectionOf,undefined)
			for(const container of tempStore){
				if(container.object.elements.length>1 && container.object.elements[0].uri==chemicalIRI){
					console.log("MATCH")
					let finalStore = store.statementsMatching(container.object.elements[1],someValuesFrom,undefined)
					for(const finalStat of finalStore){
						if(finalStat.object && finalStat.object.uri==materialIRI){
							let variables = store.statementsMatching(undefined,rdfsSubClassOf,stat.subject)
							if(variables.length>0){
								return variables[0].subject
							}
						}
					}
				}
			}
		}
	}
	return null
}

function getConcData(){
	return {"contaminants":validContaminants,"media":validMedia}
}



module.exports = {
	fetchValidData: async function(){
		await fetchValidData();
	},

	getValidVariables: function(){
		return getValidVariables();
	},

	getDatabaseNames: function(){
		return getDatabaseNames();
	},

	getValidSubs: function(iri){
		return getValidSubs(iri)
	},

	getSubs: function(iri){
		return getSubs(iri)
	},

	getConcData: function(){
		return getConcData();
	},

	getValidContaminantsByMedium: function(){
		return getValidContaminantsByMedium();
	},

	getValidMediaByContaminant: function(){
		return getValidMediaByContaminant();
	},

	getLabel: function(node){
		return getLabel(node);
	},

	printNode: function(node){
		return printNode(node);
	},

	query: function(s,p,o,g){
		return query(s,p,o,g);
	},

	getRelationships: function(iri){
		return getRelationships(iri);
	},

	countFilters: function(){
		countFilters();
	},

	findConcentrationVariable: function(chemicalIRI,materialIRI){
		return findConcentrationVariable(chemicalIRI,materialIRI)
	}
};
