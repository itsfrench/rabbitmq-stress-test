/* 
This test will act as a publisher within your RabbitMQ instance. After instantiated, you will be able to send messages to all queues with various types of tests.

This class has the following methods: connectToRabbit, publishMessage, closeConnection, prepTests, runTest, takeSnapShot, updateRabbitStressTest, and updateTarget.

There are four different types of tests you can run with this package: round-robin, random, extended-duration, and single-binding. Please pass in a string specifying which test you want to run when invoking the runTest method. 

To create a new instance of the RabbitStressTest class, you will need to provide the following: rabbitAddress, exchanges, bindings, and a target for how many messages you want to send.

  * "rabbitAddress" is URL in which the test can connect to the user's RabbitMQ's instance.
  * "exchanges" is an array containing objects with information on the exchanges
  * "bindings" is an array containing objects with the information on all of the bindings
  * "target" is the number of messages you want to send throughout your instance. 50k messages take about 1 second, and 100k messages take about 2 seconds. If a target is not provided, it will default to 1000.

examples: 
  rabbitAddress = 'amqp://localhost'
  exchanges = [{ 
      name: 'trekker_topic',
      vhost: '/',
      type: 'topic',
      durable: true,
      auto_delete: false,
      internal: false,
      arguments: {}
    }, {...}, {...}]
  bindings = [{
      source: 'trekker_topic',
      vhost: '/',
      destination: 'AuthQueue',
      destination_type: 'queue',
      routing_key: 'Auth',
      arguments: {}
    }, {...}, {...}]
*/

const amqp = require('amqplib');

class RabbitStressTest {
  constructor(rabbitAddress, exchanges, bindings, target) {
    this.rabbitAddress = rabbitAddress;
    this.exchanges = {};
    this.bindings = bindings;
    this.readyToTest = false;
    this.testMessages = [];
    this.totalMessagesSent = 0;
    this.snapShots = [];
    this.message = {
      type: 'Stress Test',
    };
    exchanges.forEach((exc) => {
      this.exchanges[exc.name] = exc;
    });
    this.target = (target) ? target : 1000;
  };

  //this method makes the connection to rabbit
  async connectToRabbitMQ() {
    try {
      this.connection = await amqp.connect(this.rabbitAddress);
      this.channel = await this.connection.createChannel();
      console.log('Connected to amqp');
    } catch (error) {
      console.error('There was an error establishing the connection or channel: ', error);
      throw error;
    }
  };

  //publishes a message to the exchange
  publishMessage(exchangeName, key, msgObj) {
    try {
      this.channel.publish(
        exchangeName,
        key,
        Buffer.from(JSON.stringify(msgObj))
      );
      this.totalMessagesSent++;
    } catch (error) {
      console.error('Error publishing message:', error);
      throw error;
    }
  };

  //closes the connection to rabbit
  async closeConnection() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
    } catch (error) {
      console.error('There was an error closing connection or channel:', error);
      throw error;
    }
  }

  // This method needs to be invoked before using the runTest method to compile all of the exchanges and bindings into a format that can be easily sent to the publisher. It will also create the connection to RabbitMQ prior to running the test.
  async prepTests() {
    await this.connectToRabbitMQ();
    this.bindings.forEach((binding) => {
      this.testMessages.push({
        exchangeName: binding.source,
        exchangeType: this.exchanges[binding.source].type,
        rabbitAddress: this.rabbitAddress,
        key: binding.routing_key,
        message: this.message,
      });
    });
    this.readyToTest = true;
  };

  //This method will check to make sure the connection and channel are established, capture the time, send messages to hit the target, take a snapshot, close the connection, and log the snapshot data. Please provide the type of test you would like to conduct (type) as the argument passed in.
  async runTest(type) {
    if (this.readyToTest === false) return;
    try {
      if (!this.connection || !this.channel) {
        await this.connectToRabbitMQ();
      }
      console.log(`Starting the ${type} test.`);
      this.start = new Date(Date.now());
      switch (type) {
        //this will send messages across all bindings in a round-robin order
        case 'round-robin': 
          while (this.totalMessagesSent <= this.target) {
            for (const msg of this.testMessages) {
              this.publishMessage(msg.exchangeName, msg.key, msg.message);
            }
          }
          break;
        //this will send messages across all bindings in a random order
        case 'random': 
          while (this.totalMessagesSent <= this.target) {
            this.randomNumber = (Math.floor(Math.random() * this.testMessages.length));
            this.publishMessage(this.testMessages[this.randomNumber].exchangeName, this.testMessages[this.randomNumber].key, this.testMessages[this.randomNumber].message);
          }
          delete this.randomNumber;
          break;
        //this test will run for one hour and send in a round-robin order
        case 'extended-duration': 
          this.testDuration = 3600000; 
          while (Date.now() - this.start < this.testDuration) {
            for (const msg of this.testMessages) {
              this.publishMessage(msg.exchangeName, msg.key, msg.message);
            }
          }
          delete this.testDuration;
          break;
        //this test will send to only one random binding up to the target number
        case 'single-binding': 
          this.randomNumber = (Math.floor(Math.random() * this.testMessages.length));
          while (this.totalMessagesSent <= this.target) {
            this.publishMessage(this.testMessages[this.randomNumber].exchangeName, this.testMessages[this.randomNumber].key, this.testMessages[this.randomNumber].message);
          };
          delete this.randomNumber;
          break;
        default:
          console.log('Could not find the type of test to run. Please ')
      }
      this.takeSnapShot(this.start);
      this.closeConnection();
      this.totalMessagesSent = 0;
      console.log(this.snapShots);
    } catch (error) {
      console.error('Error running tests:', error);
      throw error;
    }
  };

  //this will take a snapshot of the current testing environment
  takeSnapShot(startDate) {
    console.log('Taking a snapshot.');
    this.snapShots.push({
      rabbitAddress: this.rabbitAddress,
      exchanges: this.exchanges,
      bindings: this.bindings,
      testMessages: this.testMessages,
      totalMessagesSent: this.totalMessagesSent,
      target: this.target,
      start: startDate,
      end: new Date(Date.now()),
      testDuration: (Date.now() - startDate) / 1000,
      messageSuccessRate: Math.floor(
        (this.totalMessagesSent / this.target) * 100
      ),
    });
  };

  //this method will allow you to completely update your rabbitAddress, exchanges, and bindings in the test environment
  updateRabbitStressTest(rabbitAddress, exchanges, bindings) {
    this.rabbitAddress = rabbitAddress;
    this.exchanges = {};
    this.bindings = bindings;
    this.readyToTest = false;
    this.testMessages = [];
    this.totalMessagesSent = 0;
    this.message = {
      type: 'Round Robin',
    };
    exchanges.forEach((exc) => {
      this.exchanges[exc.name] = exc;
    });
  }

  //use this method to update the target of messages to be sent 
  updateTarget(target) {
    if (target && typeof target === 'number') this.target = target;
  }
}

module.exports = RabbitStressTest;
