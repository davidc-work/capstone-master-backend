var express = require('express');
var router = express.Router();
const https = require('https');
const bodyParser = require('body-parser');
const axios = require('axios').default;
const { response } = require('express');
const { Socket } = require('dgram');

var jsonParser = bodyParser.json();

router.post('/signup', jsonParser, async (req, res) => {
  console.log(req.body);
  if (!req.body.username || !req.body.password) return res.send({error: 'missing fields!'})

  let signup, i = 0;
  while (!signup && i < 10) {
    try {
      console.log('waiting for post')
      signup = (await axios.post('https://morning-plains-19920.herokuapp.com/signup', {
        username: req.body.username,
        password: req.body.password
      })).data;
      console.log('post complete');
    } catch (e) { console.log('error', i) }
    i++;
  }

  return res.send(signup || {error: 'signup error'});
});

router.post('/login', async (req, res) => {
  if (!req.body.username || !req.body.password) return res.send({error: 'missing fields!'});

  let loginData, i = 0;
  while (!loginData && i < 10) {
    try {
      loginData = (await axios.post('https://morning-plains-19920.herokuapp.com/login', {
        username: req.body.username,
        password: req.body.password
      })).data;
    } catch (e) { console.log('error', i) }
    i++;
  }

  res.send(loginData || {error: 'login error'});
});

router.post('/auth', async (req, res) => {
  if (!req.body.username || !req.body.sessionID) return res.send({error: 'missing fields!'});
 
  let authData, i = 0;
  while (!authData && i < 10) {
    try {
      authData = (await axios.post('https://morning-plains-19920.herokuapp.com/auth', {
        username: req.body.username,
        sessionID: req.body.sessionID
      })).data;
    } catch (e) { console.log('error', i) }
    i++;
  }

  res.send(authData || {error: 'authentication error'});
});

router.post('/purchase-fund', jsonParser, (req, res) => {
  if (!(req.body.fund_id && req.body.quantity && req.body.customerId)) return res.send('Missing fields!');
  (async () => {
    // get fund
    try {
      var fund = (await axios.get('https://immense-brushlands-56087.herokuapp.com/funds/' + req.body.fund_id)).data;
      fund.price = +fund.price.slice(1);
      console.log('get fund success');
    } catch (e) { return res.send(e); }
    
    // transaction
    try {
      var transaction = (await axios.post('https://transaction-microservice-v1.herokuapp.com/transactions/create', {
        type: 'purchase',
        itemDescription: fund.name,
        quantity: req.body.quantity,
        pricePerUnit: fund.price,
        fund_id: fund.id,
        CustomerId: req.body.customerId
      })).data;
      console.log('make transaction success');
    } catch (e) { return res.send(e); }

    if (transaction.error) return res.send(transaction.error);

    try {
      var portfolio = (await axios.post('https://user-profile-transaction.herokuapp.com/portfolio', {
        CustomerId: req.body.customerId,
        fundKey: fund.id,
        quantity: req.body.quantity
      })).data;
      console.log('add to portfolio success');
    } catch (e) { return res.send(e); }

    if (portfolio.error) return res.send(portfolio.error);
    
    res.send({
      fund,
      transaction,
      portfolio
    });
  })();
});

//GET all mutual funds with: associated stocks for mutual funds page where:
// params = {
//   id: Mutual Fund Id
// }
router.get("/mutual-funds", async (req,res) => {
  console.log(req.body);
  //staging api call
  let funds = await axios.get("https://immense-brushlands-56087.herokuapp.com/funds").then(({ data }) => data).catch(err => err);
  let stocks = await axios.get("http://stocks-microservice.herokuapp.com/stocks").then(({ data }) => data).catch(err => err);
  // console.log(stocks);
  funds.forEach(fund => {
    //find and match each stocks that corresponds to each mutual fund
    let stocksToSend = [];
    stocks.forEach(stock => {
      if(stock.mutualFundIds !== ""){
        stock.mutualFundIds = stock.mutualFundIds.toString().split(",");
        console.log(stock.mutualFundIds);
        stock.mutualFundIds.includes(fund.id.toString()) ? stocksToSend.push(stock) : null;
      }
    })
    fund.stocks = stocksToSend;
  })
  //Return data or response to frontend  
  res.json(funds);
});

router.get("/mutual-funds/:id", async (req,res) => {
  let fund = await axios.get("https://immense-brushlands-56087.herokuapp.com/funds/" + req.params.id).then(({ data }) => data).catch(err => err);
  let stocks = await axios.get("http://stocks-microservice.herokuapp.com/stocks").then(({ data }) => data).catch(err => err);
  
  let stocksToSend = [];
  stocks.forEach(stock => {
    if(stock.mutualFundIds !== ""){
      stock.mutualFundIds = stock.mutualFundIds.toString().split(",");
      stock.mutualFundIds.includes(fund.id.toString()) ? stocksToSend.push(stock) : null;
    }
  })
  fund.stocks = stocksToSend;

  res.json(fund);
});

//GET all stocks for stocks page
router.get("/stocks", async (req,res) => {
  console.log(req.body);
  //staging api call
  let stocks = await axios.get("http://stocks-microservice.herokuapp.com/stocks").then(({ data }) => data).catch(err => err);
  //Return data or response to frontend  
  res.json(stocks);
});

//GET specific stock for stock page
router.get("/stocks/:id", async (req,res) => {
  console.log(req.body);
  //staging api call
  let stocks = await axios.get("http://stocks-microservice.herokuapp.com/stocks/"+req.params.id).then(({ data }) => data).catch(err => err);
  //Return data or response to frontend  
  res.json(stocks);
});

//GET specific user profile with: transactions & portfolio
router.get("/users/:id", async (req,res) => {
  //staging api call
  let profile = await axios.get(`http://user-profile-transaction.herokuapp.com/customer/${req.params.id}`).then(({ data }) => data).catch(err => err);
  profile.transactions = await axios.get(`https://transaction-microservice-v1.herokuapp.com/customers/${req.params.id}`).then(({ data }) => data).catch(err => err);
  let funds = await axios.get("https://immense-brushlands-56087.herokuapp.com/funds/").then(({ data }) => data).catch(err => err);
  // profile.funds = funds.filter(f => ids.includes(f.id));
  profile.ClientPortfolios.forEach(portfolio => {
    portfolio.fundData = funds.find(f => portfolio.fundKey === f.id)
  })
  console.log(profile.funds)
  res.json(profile);
  //Return data or response to frontend
});

//GET filtered transactions based on fund id
router.get("/users/:userId/fund/:fundId", async (req, res) => {
  let customer = await axios.get(`https://transaction-microservice-v1.herokuapp.com/customers/${req.params.userId}`).then(({ data }) => data).catch(err => err);
  console.log(customer.Transactions)
  res.json(customer.Transactions.filter(transaction => transaction.fund_id === +req.params.fundId))
})

//POST a deposit transaction where:
// req.body = {
//   type: "deposit" (Must be lowercase string),
//   amount: Integer,
//   CustomerId, Integer
// }
router.post("/transactions/deposit", async (req,res) => {
  console.log(req.body);
  //staging api call
  let temp = await axios.post("https://transaction-microservice-v1.herokuapp.com/transactions/create", req.body).then(({ data }) => data).catch(err => err);
  console.log(temp)
  //Return data or response to frontend  
  res.send(temp)
});

//POST a sell transaction where:
// req.body = {
//   type: "sell" (Must be lowercase string),
//   id: Integer (Transaction id),
//   quantity: Integer (Quantity to sell will fail if greater than available or if 0),
//   CustomerId: Integer
// }
router.post("/transactions/sell", async (req,res) => {
  console.log(req.body);
  //staging api call
  let fund = await axios.get("https://immense-brushlands-56087.herokuapp.com/funds/"+req.body.mutualFundId).then(({ data }) => data).catch(err => err);
  req.body.itemDescription = fund.name;
  req.body.mutualFundId = fund.id;
  req.body.pricePerUnit = fund.price;
  console.log(req.body);
  let temp = await axios.post("https://transaction-microservice-v1.herokuapp.com/transactions/sell", req.body).then(({ data }) => data).catch(err => err);
  console.log(temp)
  //Return data or response to frontend  
  res.json(temp)
});
module.exports = router;

//PUT on a user profile
router.put("/user/:id", async (req, res) => {
  let keys = Object.keys(req.body);
  let keyBank = ["firstName", "lastName", "email", "birthdate" , "age"];
  //Deletes any unecessary req.body keys
  for (let key of keys){
    if(!keyBank.includes(key)){
      delete req.body[key]
    }
  }
  res.json(await axios.put("http://user-profile-transaction.herokuapp.com/profile/"+ req.params.id, req.body).then(({ data }) => data).catch(err => err));
})