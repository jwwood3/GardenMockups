const express = require('express')
const util = require('./queryUtil.js')
const cors = require('cors')
const app = express()
const port = 3000
var corsOptions = {
	origin: '*',
	optionsSuccessStatus: 200
}
app.use(cors(corsOptions))
util.fetchValidData().then(()=>{
	console.log("done fetching data");
	console.log(util.getConcData());
})

app.get('/', (req, res) => { // Tools for debugging, likely not for project use
	res.setHeader('Access-Control-Allow-Origin','*')
	if(req.query.ask=="rels"){ // Tool for seeing relationships between ontology terms
		//[ENDPOINT]?ask=rels&iris=[term1,term2,term3,...]
		iris = req.query.iris.trim().split(",")//
		retString = ""
		for(iri of iris){
			retString = retString + util.getRelationships(iri)
		}
		res.send(retString)
	} else if(req.query.ask=="query"){// For making general ontology queries
		// Undefined subject, predicate, and object parameters are left variable
		s=""
		p=""
		o=""
		if(req.query.sub){
			s = req.query.sub
		} else {
			s = undefined
		}
		if(req.query.pred){
			p = req.query.pred
		} else {
			p = undefined
		}
		if(req.query.obj){
			o = req.query.obj
		} else {
			o = undefined
		}
		res.send(util.query(s,p,o))

	}
})

app.get('/concentration', (req, res) => {
	res.setHeader('Access-Control-Allow-Origin','*')
	var restrict = true
	if(req.query.restrict && req.query.restrict=="false"){// The restrict tag is on by default
		restrict = false
	}
	// If restrict is true, only data in the database will be returned.
	// Otherwise, all data from the ontology will be returned
	if(req.query.ask && req.query.ask=="variable"){
		res.send(util.findConcentrationVariable(req.query.contaminant,req.query.medium)); // Get the ontology term for this contaminant/medium combination
	} else if(req.query.ask && req.query.ask=="media"){
		res.send(util.getValidMediaByContaminant())// Get the media that form pairs in the database with the given contaminant
	} else if(req.query.ask && req.query.ask=="contaminant"){
		res.send(util.getValidContaminantsByMedium())// Get the contaminants that form pairs in the database with the given medium
	} else{
		res.send(util.getConcData(restrict))
	}
})

app.get('/node', (req, res) => {
	res.setHeader('Access-Control-Allow-Origin','*')
	if(req.query.ask && req.query.ask=="label"){
		res.send(util.getLabel(req.query.iri)) // Get the simple Label of the ontology term by iri
	} else if(req.query.ask && req.query.ask=="print"){
		// Get a more full printout of the ontology term
		// including more of its node properties and relationships
		if(req.query.html){ // Format in HTML
			res.send(util.printNode(req.query.iri,true))
		} else {
			res.send(util.printNode(req.query.iri,false))
		}
	} else{
		res.status(0).send("Error: No ask parameter specified")
	}
})

app.get('/data', (req, res) => {
	res.setHeader('Access-Control-Allow-Origin','*')
	if(req.query.ask=="subs"){// Get subclasses (recursive) of the given iri that are in the database
		iri = req.query.iri.trim()
		res.send(util.getValidSubs(iri))
	} else if(req.query.ask=="dataVars"){// Get maps between database names and ontology IDs
		if(req.query.src && req.query.src.startsWith("ont")){
			res.send(util.getDatabaseNames())// Ontology -> Database
		} else {
			res.send(util.getValidVariables())// Database -> Ontology
		}
	}
})

app.listen(port, () => {
	console.log(`Example app listening at http://localhost:${port}`)
})
