function validate(){

//needs to run server side
var Github = require('github-api');

var username = document.getElementById("gitusername").value;
var reponame = document.getElementById("gitrepo").value;
var email = document.getElementById("gitemail").value;
var author = document.getElementById("gitname").value;

var oauthToken = document.getElementById("token").value;

	//create instance wrapper
	var github = new Github({
		'token' : oauthToken,
		'auth' : "oauth"
	});

	//create repo object
	var repo = github.getRepo(username, reponame);

	//set options
	var options = {
	  'author' : {'name': author, 'email': email},
	  'committer' : {'name': author, 'email': email},
	  // encode: true // Whether to base64 encode the file. (default: true)
	}

	//set the changes you want to make
	var branchToModify = 'master';
	var fileToModify = 'tempTesting.file';
	var fileContents = 'Data has been written here.';
	var commitMsg = 'API call was succesful!';

	//write the changes to github
	repo.write('master', 'README.md', '# testingrepo', 'api call was successful', options, function(err) {});

}