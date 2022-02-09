# capstone-master-backend

RVProtect: Buy and sell mutual funds.  Become a professional investor with our top of the line investing software!

The "Master Backend" is responsible for making requests to each individual microservice.  This makes much of the development process easier, particularly in regards to organization.  It also makes authentication easier, as we only need to have it go through a singular server that runs authentication middleware before handling each account-specific request.

Each microservice that the master backend is linked to requires a hardcoded secret key for security reasons.  Authentication was created from scratch, and uses a sessionID and username to determine whether a user's request is authentic.  It will respond with relevant data if, and only if, the sessionID and username are valid and match, and the requested information must be accessible to that specific customer.  If these criteria are not met, it will respond with an error message.

## Features
- Accounts/authentication
- Displays Stocks
- Displays Mutual Funds which contain stocks
- Transactions
- Transaction receipts
- Tools (Top picks, portfolio assessment, investing knowledge quiz)

## The Team
- Adlin Ahmed
- David Celeste
- Samuel Pinangay
- Wesley Tejeda

## Microservices
- <a href="https://github.com/WesleyTejeda/newBackendService">Accounts and Authentication</a> (Wesley)
- <a href="https://github.com/samuel-joseph/clientprofile-aws-microservice">User Profile and Portfolio</a> (Samuel)
- <a href="https://github.com/WesleyTejeda/transactions-microservice">Transactions</a> (Wesley)
- <a href="https://github.com/adlinahmed/stock-microservice">Stocks</a>  (Adlin)
- <a href="https://github.com/davidc-work/capstone-mutual-funds-backend">Funds</a> (David)

See the master frontend here: https://github.com/davidc-work/capstone-master-frontend
