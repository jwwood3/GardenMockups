let LANG_en = {
	'LangName': 'English',
	'LangId': 'en',
	'NODATA': 'No Data Present.',
	'SEARCH': 'LOAD DATA ONTO MAP',
	'NAME_TABLE_LABEL': 'Name',
	'DESC_TABLE_LABEL': 'Desc',
	'LOCATIONTYPE_TABLE_LABEL': 'Location Type',
	'LOCATION_TABLE_LABEL': 'Location',
	'VALUE_TABLE_LABEL': 'Value',
	'DOWNLOAD_DATA': 'DOWNLOAD DATA',
	'DATA_VALUE': 'Data Value',
	'HOVER_TRACT': 'Hover over a tract',
	'TITLE': 'Arizona Map',// The last ones are used in index.html
	'ABOUT_DATA': 'ABOUT DATA',
	'SELECT_DATA': 'SELECT DATA',
	'VARIABLE_SEARCH': 'Search for a Variable',
	'ADDRESS_SEARCH': 'Type an Address',
	'Download_Data': 'Download Data',
	'COPYLINK': 'Copy Link',
	'LEGENDLABEL': 'Legend'
};

let LANG_pig = {
	'LangName': 'Pig Latin',
	'LangId': 'pig',
	'NODATA': 'onay ataday esentpray . ',
	'SEARCH': 'OADLAY ATADAY ONTOYAY APMAY',
	'NAME_TABLE_LABEL': 'amenay',
	'DESC_TABLE_LABEL': 'escday',
	'LOCATIONTYPE_TABLE_LABEL': 'ocationlay etypay',
	'LOCATION_TABLE_LABEL': 'ocationlay',
	'VALUE_TABLE_LABEL': 'aluevay',
	'DOWNLOAD_DATA': 'OWNLOADDAY ATADAY',
	'DATA_VALUE': 'ataday aluevay',
	'HOVER_TRACT': 'overhay overyay ayay acttray',
	'TITLE': 'arizonayay apmay',// The last ones are used in index.html
	'ABOUT_DATA': 'ABOUTYAY ATADAY',
	'SELECT_DATA': 'ELECTSAY ATADAY',
	'VARIABLE_SEARCH': 'earchsay orfay ayay ariablevay',
	'ADDRESS_SEARCH': 'etypay anyay addressyay',
	'Download_Data': 'ownloadday ataday',
	'COPYLINK': 'opycay inklay',
	'LEGENDLABEL': 'egendlay'
};

let LANGS = {'en':LANG_en, 'pig':LANG_pig};

// List of topics for the query panel linked to their ontology ID
let TOPICS = {//'Contaminants':'Contaminants',// Contaminants are handled separately, so it doesn't have an ID
				// Contaminants disabled currently until it can be validated through the database properly
			  'Race or Ethnicity':'SRPDIO_2030021',
		  	  'Age':'SRPDIO_2030006',
		  	  'Minority Status':'SRPDIO_2030024',
		  	  'Civilian Status':'SRPDIO_2030000',
		  	  'Computer and Internet Access':'SRPDIO_2030003',
		  	  'Disability Status':'SRPDIO_2030001',
		  	  'Educational Status':'SRPDIO_2030002',
		  	  'Employment Status':'SRPDIO_2030018',
		  	  'Food Stamp or SNAP Status':'SRPDIO_2030013',
		  	  'Grandparent Primary Care':'SRPDIO_2030008',
		  	  'Groupd Quarters Type':'SRPDIO_2030010',
		  	  'Health Insurance Coverage':'SRPDIO_2030014',
		  	  'Housing Quality':'SRPDIO_2030009',
		  	  'Income Quality':'SRPDIO_2030011',
		  	  'Language Spoken':'SRPDIO_2030022',
		  	  'Veteran Status':'SRPDIO_2030020'};

class Model {
    constructor(langId='en') {
		if(langId in LANGS){
			this.LANG = LANGS[langId];
		} else {
			this.LANG = LANGS['en'];
		}
		this.LANGS = LANGS;
        this.variableMap = {};
        this.variableDesc = [];
        this.originalDataLists = {};
        this.blockDataLists = {};
        this.tractDataMaps = {};
        this.geojsonInstances = {};
		this.activeView = [0,0]; // Which view (map or table) is active on each side
		this.mapCount = 2; // Number of active maps
		this.isLinked = false; // Whether the map views are currently linked
		this.hasChanged = [false,false]; // Whether each map view has been changed by the user yet
		// Whether you are setting the map's zoom via code
		this.isSetByCode = false; // This should toggle to determine if an event is triggered by the map or by the code
        this.ontologyMap = {}; //Store every valid ontologyId mapped to its variable name from the database
		this.TOPICS = TOPICS;// List of topics for the query panel linked to their ontology ID
	}

    /**
     * Getter functions for the various data types in each map
     */
    getVariables() {
        return this.variableDesc;
    }

    getDataComponents() {
        return this.dataComponents;
    }

    getUnits(variableName) {
        return this.variableMap[variableName]['unit'];
    }

    /*
     * Check to see if the given ACS variable is in the database
     */
    checkACSVariable(acsID){
        for (let i = 0; i < this.variableDesc.length; i++) {
            if (this.variableMap[this.variableDesc[i]]['name'] == acsID) {
                return true;
            }
        }
        return false;
    }

    /*
     * Check to see if the given EJS variable is in the database
     */
    checkEJSVariable(ejsID){
        for (let i = 0; i < this.variableDesc.length; i++) {
            if (this.variableMap[this.variableDesc[i]]['name'] == ejsID) {
                return true;
            }
        }
        return false;
    }

	/**
	  * Check to see if the given contaminant variable is in the database
	  */
    checkConcentrationVariable(material, medium) {
        elementToSymbol = {// Currently elements are listed in the database by symbol and name, so we need to convert between them
            "hydrogen":"h","helium":"he","lithium":"li","beryllium":"be","boron":"b","carbon":"c","nitrogen":"n","oxygen":"o",
            "fluorine":"f","neon":"ne","sodium":"na","magnesium":"mg","aluminum":"al","aluminium":"al","silicon":"si","phosphorus":"p","sulfur":"s",
            "chlorine":"cl","argon":"ar","potassium":"k","calcium":"ca","scandium":"sc","titanium":"ti","vanadium":"v","chromium":"cr",
            "manganese":"mn","iron":"fe","cobalt":"co","nickel":"ni","copper":"cu","zinc":"zn","gallium":"ga","germanium":"ge",
            "arsenic":"as","selenium":"se","bromine":"br","krypton":"kr","rubidium":"rb","strontium":"sr","yttrium":"y","zirconium":"zr",
            "niobium":"nb","molybdenum":"mo","technetium":"tc","ruthenium":"ru","rhodium":"rh","palladium":"pd","silver":"ag","cadmium":"cd",
            "indium":"in","tin":"sn","antimony":"sb","tellurium":"te","iodine":"i","xenon":"xe","cesium":"cs","barium":"ba",
            "lanthanum":"la","cerium":"ce","praseodymium":"pr","neodymium":"nd","promethium":"pm","samarium":"sm","europium":"eu","gadolinium":"gd",
            "terbium":"tb","dysprosium":"dy","holmium":"ho","erbium":"er","thulium":"tm","ytterbium":"yb","lutetium":"lu","hafnium":"hf",
            "tantalum":"ta","wolfram":"w","rhenium":"re","osmium":"os","iridium":"ir","platinum":"pt","gold":"au","mercury":"hg",
            "thallium":"tl","lead":"pb","bismuth":"bi","polonium":"po","astatine":"at","radon":"rn","francium":"fr","radium":"ra",
            "actinium":"ac","thorium":"th","protactinium":"pa","uranium":"u","neptunium":"np","plutonium":"pu","americium":"am","curium":"cm",
            "berkelium":"bk","californium":"cf","einsteinium":"es","fermium":"fm","mendelevium":"md","nobelium":"no","lawrencium":"lr","rutherfordium":"rf",
            "dubnium":"db","seaborgium":"sg","bohrium":"bh","hassium":"hs","meitnerium":"mt","darmstadtium ":"ds ","roentgenium ":"rg ","copernicium ":"cn ",
            "nihonium":"nh","flerovium":"fl","moscovium":"mc","livermorium":"lv","tennessine":"ts","oganesson":"og"
        }
		//Map from what the medium is called in the ontology to its database name
        ontologyMediumToDatabaseMedium = {
            "shoot system":"brassica vegetables",
            "bulb":"bulb vegetables",
            "distilled water":"field blank",
            "fruits":"fruiting vegetables",
            "fruit":"fruiting vegetables",
            "vascular leaf":"",// covers both "herbs" and "leafy" Not sure how to handle this yet
            "seed":"legumes",
            "plant structure":"other",
            "root":"root and tuber vegetables",
            "top soil":"yard soil",
            "tap water":"water",
            "well water":"",// Not in database? might be under another water designation
            "fresh water":""// Not in database? might be under another water designation
        }
        for (let i = 0; i < this.variableDesc.length; i++) { // Check to see if the contaminant/medium combination is in the database
            if (this.variableMap[this.variableDesc[i]]['name'] == material || (material in elementToSymbol && this.variableMap[this.variableDesc[i]]['name'] == elementToSymbol[material])) {
                if(this.variableMap[this.variableDesc[i]]['medium'] == medium || (medium in ontologyMediumToDatabaseMedium && this.variableMap[this.variableDesc[i]]['medium'] == ontologyMediumToDatabaseMedium[medium])) {
                    return true;
                }
            }
        }
        return false;
    }

    getOriginalData(key) {
        if (key in this.originalDataLists)
            return this.originalDataLists[key];
        return [];
    }

    getBlockData(key) {
        if (key in this.blockDataLists)
            return this.blockDataLists[key];
        return [];
    }

    getTractData(key) {
        if (key in this.tractDataMaps)
            return this.tractDataMaps[key];
        console.log("Tract data key " + key + " not found");
        return {};
    }

    getColorMapping(colors, key) {
        let minmax = this._getMinMax(key);
        let min = minmax[0];
        let max = minmax[1];
        let diff = max - min;
        return function (d) {
            return (d < max) ? colors[Math.floor((d - min) * 8.0 / diff)] : colors[colors.length - 1];
        }
    }

    getGeoJson(key) {
        if (key in this.geojsonInstances) {
            return this.geojsonInstances[key];
        }
        return null;
    }

    getColor(key) {
        console.log(key);
    }

    setGeoJson(key, geojson) {
        this.geojsonInstances[key] = geojson;
    }

    removeData(key) {
        delete this.originalDataLists[key];
        delete this.blockDataLists[key];
        delete this.tractDataMaps[key];
        delete this.geojsonInstances[key];
    }

    /**
     * Return an array of colors that represent different level in the map/legend based on
     * the darkest and lightest color
     * @param {*} minColor
     * @param {*} maxColor
     */
    interpolate(minColor, maxColor) {
        var colorInterpolator = d3.interpolateRgb(minColor, maxColor);
        var steps = 8;
        var colors = d3.range(0, (1 + 1 / steps), 1 / (steps - 1)).map(function (d) {
            return colorInterpolator(d)
        });
        return colors;
    }
	/**
	  * Get the map from ontology IDs to variable IDs from the server
	  */
	async fetchOntologyDataMap(){
		fetch("http://localhost:3000/data?ask=dataVars&src=ontology")
		.then((res)=>{
			res.json()
			.then((data)=>{
				this.ontologyMap = data
			})
		})
	}

    /**
     * Fetches the scrutinizer variable metadata and stores it in the variableDesc and variableMap
     * variables.
     * variableDesc is a list in this format for each variable: description (name)
     * variableMap has each value of variableDesc as a key mapped to the metadata pulled from the
     * scrutinizer
     */
    async fetchVariables() {
        const response = await fetch("https://src.cals.arizona.edu/api/v1/scrutinizer/variables");
        const variables = await response.json();
        for (let i=0; i<variables.length; i++) {
            let desc = variables[i]['desc'] + ' (' + variables[i]['name'] + ')';
            this.variableDesc.push(desc);
            this.variableMap[desc] = variables[i];
        }
    }

    /**
     * Fetches the scrutinizer data for the specified variable. The data is stored in the
     *  originalDataLists, tractDataMaps, and blockDataLists variables under the specified
     *  key.
     * @param {} key The key that will be used to store the fetched data
     * @param {*} variableName The name of the variable that will be fetched
     */
    async fetchData(key, variableName) {
        let variable = this.variableMap[variableName]['name'];
        const response = await fetch("https://src.cals.arizona.edu/api/v1/scrutinizer/measurements?variable=" + variable);
        const data = await response.json();
        this.originalDataLists[key] = data;
        await this._createBlockData(key, data);
        await this._createTractDataMap(key, data);
    }

    /**
     * Fills the blockDataLists variable under the specified key with the specified data. Each object in
     * the data list should have at least the 'location_type' and 'location_name' specifiers.
     * @param {*} key
     * @param {*} data
     */
    async _createBlockData(key, data) {
        let blockData = [];
        for (let i=0; i<data.length; i++) {
            if (data[i]['location_type'] === 'block_group' || data[i]['location_type'] === 'census_block') {
                if (data[i]['location_name'][0] !== '0') {
                    data[i]['location_name'] = '0' + data[i]['location_name'];
                }
                blockData.push(data[i]);
            } else if (data[i]['location_type'] === 'centroid' || data[i]['location_type'] === 'point') {
            }
        }
        this.blockDataLists[key] = blockData;
    }

    /**
     * Fills the tractDataMaps variable under the specified key with the specified data. Each object
     * in the data list should have at least the 'location_name' and 'location_type' specifiers
     * @param {} key
     */
    async _createTractDataMap(key, data) {
        if (!(key in this.blockDataLists)) {
            console.log("Error in getBlockDataMap, " + key + " is not present.");
            return -1;
        }
        let tractData = {};
        for (let i=0; i<data.length; i++) {
            if (data[i]['location_type'] === 'block_group' || data[i]['location_type'] === 'census_block') {
                let tractId = data[i]['location_name'].slice(0, 11); // Organized as tracts, not block groups
                let value = parseFloat(data[i]['value']);
                if (!(tractId in tractData)) {
                    tractData[tractId] = [0, 0];
                }
                tractData[tractId][0] += value; // Current sum of values in the tract
                tractData[tractId][1] += 1;     // Current num of values in the tract
            }

        }
        this.tractDataMaps[key] = tractData;
    }

    /**
     * Gets the minimum and maximum data values from the tractMap under the specified key.
     * @param {*} key
     */
    _getMinMax(key) {
        if (!(key in this.tractDataMaps)) {
            return [-1, -1];
        }
        let min = Number.MAX_VALUE;
        let max = Number.MIN_SAFE_INTEGER;
        let tractMap = this.tractDataMaps[key];
        for (var tractId in tractMap) {
            let avg = tractMap[tractId][0] / tractMap[tractId][1];
            if (avg < min) {
                min = avg;
            }
            if (max < avg) {
                max = avg;
            }
        }
        return [min, max];
    }

	/**
	* Returns an object containing the keys and values
	* from the query string in the url
	*/
	getQueryFlags(){
		let retVal = {};
		let searchString = window.location.search;
		if(searchString==null || searchString.trim().length == 0)
		{
			return retVal;
		}
		var vars = window.location.search.substring(1).split("&");
		for (var i=0;i<vars.length;i++) {
			var declaration = vars[i].split("=");
			declaration[1] = declaration[1].replaceAll("%20"," ");
			if(!isNaN(parseFloat(declaration[1]))){
				declaration[1] = parseFloat(declaration[1]);
			}
			retVal[declaration[0]] = declaration[1];
		}
		return retVal;
	}
}
