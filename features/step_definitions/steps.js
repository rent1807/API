/* eslint no-unused-expressions: off */
/* eslint func-names: off */
/* eslint no-underscore-dangle: off */
const { Given, When, Then } = require('cucumber');
const fetch = require('node-fetch');
const { expect } = require('chai');
const waitOn = require('wait-on');

const hcBackendUrl = 'http://localhost:3030';

let currentUser;
let currentUserPassword;
let httpResponse;
let currentUserAccessToken;

function authenticate(email, plainTextPassword) {
  const formData = {
    email,
    password: plainTextPassword,
    strategy: 'local',
  };
  return fetch(`${hcBackendUrl}/authentication`, {
    method: 'post',
    body: JSON.stringify(formData),
    headers: { 'Content-Type': 'application/json' },
  }).then(response => response.json())
    .catch((err) => {
      throw (err);
    })
    .then(json => json.accessToken);
}

function postRequest(route, body, callback) {
  const params = {
    method: 'post',
    body,
    headers: { 'Content-Type': 'application/json' },
  };
  if (currentUserAccessToken) {
    params.headers.Authorization = `Bearer ${currentUserAccessToken}`;
  }
  fetch(`${hcBackendUrl}${route}`, params)
    .then(response => response.json())
    .catch((err) => {
      throw (err);
    })
    .then((json) => {
      httpResponse = json;
      callback();
    });
}

Given(/^the Human Connection API is up and running(?: on "http:\/\/localhost:3030")?/, (callback) => {
  waitOn({ resources: ['tcp:3030'], timeout: 30000 }, (err) => {
    if (err) throw (err);
    return callback();
  });
});

Given('there is a 3rd party application running, e.g. \'Democracy\'', () => {
  // Just documentation
});

Given('there is a user in Human Connection with these credentials:', function (dataTable) {
  const params = dataTable.hashes()[0];
  currentUserPassword = params.password;
  return this.app.service('users').create(params).then((user) => {
    currentUser = user;
  });
});

Given('you are authenticated', () => authenticate(currentUser.email, currentUserPassword).then((accessToken) => {
  currentUserAccessToken = accessToken;
}));

When('you send a POST request to {string} with:', (route, body, callback) => postRequest(route, body, callback));

Then('there is an access token in the response:', (jsonResponse) => {
  expect(httpResponse.accessToken).to.be.a('string');
  expect(httpResponse.accessToken.length).to.eq(342);
  const expectedAccessToken = JSON.parse(jsonResponse).accessToken;
  const expectedFirstPartOfJwt = expectedAccessToken.split('.')[0];
  expect(httpResponse.accessToken.split('.')[0]).to.eq(expectedFirstPartOfJwt);
});

Then('a new post is created', function () {
  return this.app.service('contributions').find({}).then((contributions) => {
    expect(contributions.total).to.eq(1);
    expect(contributions.data[0].type).to.eq('post');
  });
});


Then('your language {string} is stored in your user settings', function (lang) {
  return this.app.service('usersettings').find({userId: currentUser._id.toString()}).then((settings) => {
    expect(settings.total).to.eq(1);
    expect(settings.data[0].uiLanguage).to.eq(lang);
  });
});

Then('debug', function() {
  // eslint-disable-next-line no-debugger
  debugger;
});

When('you create your user settings via POST request to {string} with:', function (route, body, callback) {
  let jsonBody = JSON.parse(body);
  jsonBody.userId = currentUser._id.toString();
  postRequest(route, JSON.stringify(jsonBody), callback);
});

