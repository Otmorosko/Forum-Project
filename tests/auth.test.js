/* eslint-env mocha */
/* global describe,it */
const { expect } = require('chai');
const request = require('supertest');
const { app } = require('../server'); // importuje aplikację bez uruchamiania serwera

describe('Authentication', function() {
  this.timeout(5000);

  it('should register a new user', async function() {
    const res = await request(app)
      .post('/register')
      .send({ username: 'testuser', password: 'TestPass123!' })
      .set('Accept', 'application/json');

    expect(res.status).to.be.oneOf([200,201]);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.property('success');
  });

  it('should login an existing user', async function() {
    const res = await request(app)
      .post('/login')
      .send({ username: 'testuser', password: 'TestPass123!' })
      .set('Accept', 'application/json');

    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.property('token');
  });
});
