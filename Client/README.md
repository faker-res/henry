# Sinonet Management Tool Client 


## Setup 
	
#####[Install NodeJS](https://nodejs.org/en/download/)

Clone the repository, run `npm install` to grab the dependencies.
	
	npm install

## Running the app

Runs like a typical express app:

    node app.js
    
## Config

Config web server at app.js

Config management server url 

`'MANAGEMENT_SERVER_URL' : 'http://192.168.1.13:9000'` at  
	
	
	/public/js/app.js
	/public/js/login.js
	
	
## Directory Layout
    
    app.js              --> app config
    package.json        --> for npm
    public/             --> all of the files to be used in on the client side
      css/              --> css files
        app.css         --> default stylesheet
      img/              --> image files
      js/               --> javascript files
        app.js          --> declare top-level app module
        controllers.js  --> application controllers
        directives.js   --> custom angular directives
        filters.js      --> custom angular filters
        services.js     --> custom angular services
        lib/            --> angular and 3rd party JavaScript libraries
          angular/
            angular.js            --> the latest angular js
            angular.min.js        --> the latest minified angular js
            angular-*.js          --> angular add-on modules
            version.txt           --> version number
		  jquery/
		    jquery-*.min.js		  --> the latest jquery min
	  sb-admin-2/				  --> SB Admin 2 resource files, including bootstrap
		...
    routes/
      api.js            --> route for serving JSON
      index.js          --> route for serving HTML pages and partials
    views/
      index.jade        --> main page for app
      layout.jade       --> doctype, title, head boilerplate
	  navigation.jade   --> top and side navigation bars
      partials/         --> angular view partials (partial jade templates)
      category/         --> admin tool views
		blank.jade	
		buttons.jade	
		dashboard.jade	
		flot.jade	
		forms.jade	
		grid.jade	
		login.jade	
		morris.jade	
		notifications.jade	
		panels-wells.jade	
		tables.jade	
		typography.jade



## Framework

[Angular Express Bootstrap SB Admin Seed](https://github.com/jlibert/angular-express-bootstrap-sb-admin-seed)

[SB Admin 2](https://github.com/IronSummitMedia/startbootstrap-sb-admin-2)

