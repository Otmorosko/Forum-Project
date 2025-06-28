const chai = require('chai');
const chaiHttp = require('chai-http');

chai.use(chaiHttp);
const { describe, it } = require('mocha');
const expect = chai.expect;

const serverUrl = 'http://localhost:3000'; // Use running server URL

describe('Authentication', () => {
  it('should register a new user', function(done) {
    chai.request(serverUrl)
      .post('/register')
      .send({ username: 'testuser', password: 'TestPass123!' })
      .end(function(err, res) {
        expect(res).to.have.status(200);
        expect(res.body).to.be.an('object');
        expect(res.body).to.have.property('success').eql(true);
        done();
      });
  });

  it('should login an existing user', function(done) {
    chai.request(serverUrl)
      .post('/login')
      .send({ username: 'testuser', password: 'TestPass123!' })
      .end(function(err, res) {
        expect(res).to.have.status(200);
        expect(res.body).to.be.an('object');
        expect(res.body).to.have.property('token');
        done();
      });
  });
});
