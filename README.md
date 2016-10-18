# iAmNotARobot
Chrome browser extension intended to autocomplete Google's reCAPTCHA fields
using Clarifai's REST API and ESA Semantic Relatedness API. It only works when
cross origin resource sharing is disabled on chrome since reCAPTCHA is usually 
in an iFrame that isn't the same origins as the page that has the iFrame embedded.
