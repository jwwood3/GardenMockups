let LANG_en = {
	'LangName': 'English',
	'LangId': 'en',
	'NODATA': 'No Data Present.',
	'SEARCH': 'Search',
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
	'SEARCH': 'earchsay',
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