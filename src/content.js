var tagDepth;
var tagRelevanceValues;
var checkboxes;
var imageDimension;
var isSigns = false;
var signImage;

function getCredentials(cb) {
  var data = {
    'grant_type': 'client_credentials',
    'client_id': 'clarifai_account_id',
    'client_secret': 'clarifai_secret_token'
  };

  return $.ajax({
    'url': 'https://api.clarifai.com/v1/token',
    'data': data,
    'type': 'POST'
  })
  .then(function(r) {
    localStorage.setItem('accessToken', r.access_token);
    localStorage.setItem('tokenTimestamp', Math.floor(Date.now() / 1000));
    cb();
  });
}

function findIframe(parent)
{
    var children = parent.children;

    for (var i = 0; i < children.length; i++) {

        var iFrameFound = findIframe(children[i]);
        if(iFrameFound)
        {
            return iFrameFound;
        }
		
        if(children[i].nodeName.includes('IFRAME') && children[i].title.includes('recaptcha challenge'))
        {
            return children[i].contentWindow.document;
        }
    }
}

function findJoinedImageSource(parent)
{
    var children = parent.children;

    for (var i = 0; i < children.length; i++) {

        var imageSrcFound = findJoinedImageSource(children[i]);
        if(imageSrcFound)
        {	
            return imageSrcFound;
        }

        if(children[i].className.includes('rc-image-tile-33'))
        {
			imageDimension = 3;
			tagDepth = 5;
            return children[i].src;
        }
		if(children[i].className.includes('rc-image-tile-44'))
        {
			imageDimension = 4;
			tagDepth = 1;
            return children[i].src;
        }
    }
}

function findCategoryKeyword(parent)
{
    var children = parent.children;

    for (var i = 0; i < children.length; i++) {

        var categoryKeywordFound = findCategoryKeyword(children[i]);
        if(categoryKeywordFound)
        {
            return categoryKeywordFound;
        }

        if(children[i].className.includes('rc-imageselect-desc'))
        {	
        	if(!children[i].className.includes('canonical')) {
				var isSigns = true;
				var signImage = parent.getElementsByTagName('img')[0].src;	
        	}
            return children[i].innerHTML.match('<strong>(.*)<\/strong>')[1];
        }
    }
}

function findCheckBox(parent, arr)
{
    var children = parent.children;
    for (var i = 0; i < children.length; i++) {
        arr.concat(findCheckBox(children[i], arr));
        if(children[i].className.includes('rc-imageselect-checkbox'))
        {
            arr.push(children[i])
        }    
        
    }
    return arr;
}


function breakIntoPiecesAndSerialize(imageToBreak, gridSize)
{
    var imagePieces = [];
    
    var pieceWidth = imageToBreak.width / gridSize;
    var pieceHeight = imageToBreak.height / gridSize;
    
    for(var j = 0; j < gridSize; j++)
    {
        for(var i = 0; i < gridSize; i++)
        {
            var canvas = document.createElement("canvas");
            canvas.width = pieceWidth;
            canvas.height = pieceHeight;
            var context = canvas.getContext('2d');
            context.drawImage(imageToBreak, i * pieceWidth, j * pieceHeight, pieceWidth, pieceHeight, 0, 0, canvas.width, canvas.height);
            imagePieces.push(canvas.toDataURL().replace(/^data:image\/(png|jpg);base64,/, ""));
        }
    }
    
    return imagePieces;
}


function getTagConfidence(serializedImage, imageIndex, category) {

  var accessToken = localStorage.getItem('accessToken');
  
  var encodedData = {
    'encoded_data' : serializedImage,
	'select_classes': 'sign'
  };

  return $.ajax({
  'url': 'https://api.clarifai.com/v1/tag/',
    'headers': {
      'Authorization': 'Bearer ' + accessToken
    },
  'data': encodedData,
  'method': 'POST',
  success: function(data) {
    // Do Stuff
    }	
  }).then(function(r){
    var tags = parseClarifaiResponseForTags(r);
	
	tagRelevanceValues[imageIndex][0] = tags.probs[0];
	
	var allImagesRanked = true;
	
	for(var i = 0; i < imageDimension*imageDimension; i++)
	{
		for(var j = 0; j < tagDepth; j++)
		{
			if(tagRelevanceValues[i][j] == -1)
			{
				allImagesRanked = false;
			}
		}
	}
	
	if(allImagesRanked)
	{
		var allImageRelevances = [];
		for(var j = 0; j < imageDimension*imageDimension; j++)
		{
			var imageRelevance = 0;
			for(var i = 0; i < tagDepth; i++)
			{
				imageRelevance = imageRelevance + tagRelevanceValues[j][i];
			}
			console.log(imageRelevance);
			allImageRelevances[j] = imageRelevance;
			
			
			
		}
		
		// Calc avg
		var averageRelevance = 0;
		for(var i = 0; i < imageDimension*imageDimension; i++)
		{
			averageRelevance = averageRelevance + allImageRelevances[i];
		}
		averageRelevance = averageRelevance / (imageDimension*imageDimension);
		console.log("Average: " + averageRelevance);
		
		
		
		
		
		var topImageIds = [];
		//var numImagesSelected = 6;
		
		for(var i = 0; i < imageDimension*imageDimension; i++)
		{
			if(allImageRelevances[i] > averageRelevance)
			{
				topImageIds.push(i);
			}
		}
		
		console.log(topImageIds);
		
		for(var i = 0; i < topImageIds.length; i++)
		{
			checkboxes[topImageIds[i]].click();
		}
	}
	
	
	
	
	
	
  });

}



function parseTagConfidence(resp) {
  var tags = [];
  if (resp.status_code === 'OK') {
    var results = resp.results;
	tags = results[0].result.tag;
  } 
  else
  {
    console.log('Sorry, something is wrong.');
  }
  return tags;
}


function postImageCanonForTags(serializedImage, imageIndex, category) {
	var accessToken = localStorage.getItem('accessToken');
  
  var encodedData = {
    'encoded_data' : serializedImage
  };

  return $.ajax({
  'url': 'https://api.clarifai.com/v1/tag',
    'headers': {
      'Authorization': 'Bearer ' + accessToken
    },
  'data': encodedData,
  'method': 'POST',
  success: function(data) {
    // Do Stuff
    }
  }).then(function(r){
    var tags = parseClarifaiResponseForTags(r);
	
	doSomeSigns(tags, imageIndex);
  });	
}

function postImageForTags(serializedImage, imageIndex, category) {

  var accessToken = localStorage.getItem('accessToken');
  
  var encodedData = {
    'encoded_data' : serializedImage
  };

  return $.ajax({
  'url': 'https://api.clarifai.com/v1/tag',
    'headers': {
      'Authorization': 'Bearer ' + accessToken
    },
  'data': encodedData,
  'method': 'POST',
  success: function(data) {
    // Do Stuff
    }
  }).then(function(r){
    var tags = parseClarifaiResponseForTags(r);
	
	for(var i = 0; i < tagDepth; i++)
	{
		doSomeESA(category, tags.classes[i], imageIndex, i);
	}
  });
  

}

function doSomeESA(targetCategory, descriptiveTag, imageIndex, tagIndex)
{
	var comparedWords = {
	"t1": targetCategory,
	"t2": descriptiveTag
	}

	return $.ajax({
	'url': 'https://amtera.p.mashape.com/relatedness/en',
    'headers': {
      'X-Mashape-Key': 'Mashape-api-key',
	  'Accept': 'application/json',
	  'Content-Type': 'application/json'
    },
  'data': JSON.stringify(comparedWords),
  'method': 'POST',
  success: function(data) {
    // Do stuff
    }	
  }).then(function(r){
    parseESAResponse(r, imageIndex, targetCategory, tagIndex);
  });
}

function doSomeSigns(arrTags, imageIndex)
{
	var accessToken = localStorage.getItem('accessToken');
  
  var encodedData = {
    'encoded_data' : signImage.replace(/^data:image\/(png|jpg);base64,/, "")
  };

  return $.ajax({
  'url': 'https://api.clarifai.com/v1/tag',
    'headers': {
      'Authorization': 'Bearer ' + accessToken
    },
  'data': encodedData,
  'method': 'POST',
  success: function(data) {
    // Do Stuff
    }
  }).then(function(r){
    var tags = parseClarifaiResponseForTags(r);	
    compareTagArrays(r, arrTags);
  });
}

function parseClarifaiResponseForTags(resp) {
  var tags = [];
  if (resp.status_code === 'OK') {
    var results = resp.results;
	tags = results[0].result.tag;
  } 
  else
  {
    console.log('Sorry, something is wrong.');
  }
  return tags;
}

function parseESAResponse(resp, imageIndex, targetCategory, tagIndex) {

    var value = resp.v;
	
	tagRelevanceValues[imageIndex][tagIndex] = value;
	
	var allImagesRanked = true;
	
	for(var i = 0; i < imageDimension*imageDimension; i++)
	{
		for(var j = 0; j < tagDepth; j++)
		{
			if(tagRelevanceValues[i][j] == -1)
			{
				allImagesRanked = false;
			}
		}
	}
	
	if(allImagesRanked)
	{
		var allImageRelevances = [];
		for(var j = 0; j < imageDimension*imageDimension; j++)
		{
			var imageRelevance = 0;
			for(var i = 0; i < tagDepth; i++)
			{
				if(tagRelevanceValues[j][i] > imageRelevance)
				{
					imageRelevance = imageRelevance + tagRelevanceValues[j][i];
				}
			}
			console.log(imageRelevance);
			allImageRelevances[j] = imageRelevance;
			
		}
		
		var topImageIds = [];
		var numImagesSelected = 4;
		
		for(var i = 0; i < numImagesSelected; i++)
		{
			var tempMaxId = 0;
			for(var j = 1; j < allImageRelevances.length; j++)
			{
				if(allImageRelevances[j] > allImageRelevances[tempMaxId])
				{
					tempMaxId = j;
				}
			}
			topImageIds[i] = tempMaxId;
			allImageRelevances[tempMaxId] = -1;
		}
		
		/*
		// Calc avg
		var averageRelevance = 0;
		for(var i = 0; i < imageDimension*imageDimension; i++)
		{
			averageRelevance = averageRelevance + allImageRelevances[i];
		}
		averageRelevance = averageRelevance / (imageDimension*imageDimension);
		console.log("Average: " + averageRelevance);
		
		
		
		
		
		var topImageIds = [];
		//var numImagesSelected = 6;
		
		for(var i = 0; i < imageDimension*imageDimension; i++)
		{
			if(allImageRelevances[i] > averageRelevance)
			{
				topImageIds.push(i);
			}
		}
		*/
		
		
		console.log(topImageIds);
		
		for(var i = 0; i < topImageIds.length; i++)
		{
			checkboxes[topImageIds[i]].click();
		}
	}
	
	
  return value;
}







function doTheStuff()
{
    var iFrame = findIframe(document.body);
	
    var imageSrc = findJoinedImageSource(iFrame.body);
    var category = findCategoryKeyword(iFrame.body);
	
	checkboxes = new Array();
	checkboxes = findCheckBox(iFrame.body, checkboxes);
	
	
	
	tagRelevanceValues = new Array();
	for(var i = 0; i < imageDimension*imageDimension; i++)
	{
		tagRelevanceValues[i] = new Array(tagDepth);
		for(var j = 0; j < tagDepth; j++)
		{
			tagRelevanceValues[i][j] = -1;
		}
	}

	

    var theImage = new Image();

    theImage.setAttribute('crossOrigin', 'anonymous');
    theImage.addEventListener("load", function() {
        
        var pieces = breakIntoPiecesAndSerialize(theImage, imageDimension);
        function imgCall;
        if(isSigns)
        	imgCall = postImageCanonForTags;
        else
        	imgCall = postImageForTags;
        for(var i = 0; i < pieces.length; i++)
        {
			if(imageDimension == 3)
			{
				imgCall(pieces[i], i, 'sign');
			}
			else if(imageDimension == 4)
			{
				getTagConfidence(pieces[i], i, 'sign')
			}
        }
        
    }, false);




    theImage.src = imageSrc;
	
    return null;
}

function iAmNotARobot()
{
    if (localStorage.getItem('tokenTimeStamp') - Math.floor(Date.now() / 1000) > 86400
    || localStorage.getItem('accessToken') === null) {
    getCredentials(doTheStuff);
        } else {
            doTheStuff();
  }
}

iAmNotARobot();
