/* 
This class acts as a publisher within your RabbitMQ instance. Once instantiated, you can send messages to all queues for various types of tests.

This class includes the following methods: connectToRabbitMQ, publishMessage, closeConnection, prepTests, runTest, takeSnapShot, updateRabbitStressTest, and updateTarget.

There are four types of tests you can run with this package: round-robin, random, extended-duration, and single-binding. When invoking the runTest method, please provide a string specifying which test you want to run.

To create a new instance of the RabbitStressTest class, you need to provide the following parameters: rabbitAddress, exchanges, bindings, message, and target.


  * "rabbitAddress" is the URI specifying the protocol and location for connecting to a RabbitMQ server. If you're connecting to an instance running on your local machine, use "amqp://localhost". Otherwise, specify the IP address of the machine running the RabbitMQ instance you want to test.
  * "exchanges" is an array containing objects with information on the exchanges. Examples are provided below.
  * "bindings" is an array containing objects with information on all the bindings. Examples are provided below.
  * "message" is an object containing any information you want this class to send to all consumers when running the test. If no message object is provided, it defaults to an object with one key-value pair, "{type: 'Stress Test'}".
  * "target" is the number of messages you want to send throughout your instance. Sending 50k messages takes about 1 second, and 100k messages take about 2 seconds. If a target is not provided, it defaults to 1000.


examples: 
  rabbitAddress = 'amqp://localhost'
  
  exchanges = [{ 
      name: 'exchange_topic',
      vhost: '/',
      type: 'topic',
      durable: true,
      auto_delete: false,
      internal: false,
      arguments: {}
    }, {...}, {...}]

  bindings = [{
      source: 'exchange_topic',
      vhost: '/',
      destination: 'AuthQueue',
      destination_type: 'queue',
      routing_key: 'Auth',
      arguments: {}
    }, {...}, {...}]
*/

const amqp = require('amqplib');

class RabbitStressTest {
  constructor(rabbitAddress, exchanges, bindings, message, target) {
    this.rabbitAddress = rabbitAddress;
    this.exchanges = {};
    this.bindings = bindings;
    this.readyToTest = false;
    this.testMessages = [];
    this.totalMessagesSent = 0;
    this.snapShots = [];
    this.message = (message) ? message : { type: 'Stress Test' };
    exchanges.forEach((exc) => {
      this.exchanges[exc.name] = exc;
    });
    this.target = (target) ? target : 1000;
  };

  //This method establishes a connection to RabbitMQ and creates a channel on the connection.

  async connectToRabbitMQ() {
    try {
      this.connection = await amqp.connect(this.rabbitAddress);
      this.channel = await this.connection.createChannel();
    } catch (error) {
      console.error('There was an error establishing the connection or channel: ', error);
      throw error;
    }
  };

  //This method publishes a message to the exchange.

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

  //This method closes the connection to RabbitMQ. 

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

  //This method compiles all exchanges and bindings into a format that can be easily sent to the publisher and invokes 'connectToRabbitMQ' before you invoke the 'runTest' method.

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

  //This method will check to make sure the connection and channel are established, capture the start time, send messages to hit the target, take a snapshot, and close the connection. Please provide the type of test you would like to conduct (type) as the argument passed in. If you have not already invoked 'prepTests', this method will return without sending any messages. 

  async runTest(type) {
    if (this.readyToTest === false) return;
    try {
      if (!this.connection || !this.channel) {
        await this.connectToRabbitMQ();
      }
      this.start = new Date(Date.now());
      switch (type) {
        //This test type will send messages across all bindings in a round-robin order.
        case 'round-robin':
          while (this.totalMessagesSent <= this.target) {
            for (const msg of this.testMessages) {
              this.publishMessage(msg.exchangeName, msg.key, msg.message);
            }
          }
          break;
        //This test type will send messages across all bindings in a random order.
        case 'random':
          while (this.totalMessagesSent <= this.target) {
            this.randomNumber = (Math.floor(Math.random() * this.testMessages.length));
            this.publishMessage(this.testMessages[this.randomNumber].exchangeName, this.testMessages[this.randomNumber].key, this.testMessages[this.randomNumber].message);
          }
          delete this.randomNumber;
          break;
        //This test type will run for one hour and send in a round-robin order.
        case 'extended-duration':
          this.testDuration = 3600000;
          while (Date.now() - this.start < this.testDuration) {
            for (const msg of this.testMessages) {
              this.publishMessage(msg.exchangeName, msg.key, msg.message);
            }
          }
          delete this.testDuration;
          break;
        //This test type will send to only one random binding up to the target number.
        case 'single-binding':
          this.randomNumber = (Math.floor(Math.random() * this.testMessages.length));
          while (this.totalMessagesSent <= this.target) {
            this.publishMessage(this.testMessages[this.randomNumber].exchangeName, this.testMessages[this.randomNumber].key, this.testMessages[this.randomNumber].message);
          };
          delete this.randomNumber;
          break;
        default:
          console.error('Could not find the type of test to run. Please ')
      }
      this.takeSnapShot(this.start, type);
      this.closeConnection();
      this.totalMessagesSent = 0;
    } catch (error) {
      console.error('Error running tests:', error);
      throw error;
    }
  };

  //This method takes a snapshot of the current testing environment, including the start time, end time, duration, and message success rate.

  takeSnapShot(startDate, type) {
    this.snapShots.push({
      rabbitAddress: this.rabbitAddress,
      exchanges: this.exchanges,
      bindings: this.bindings,
      testMessages: this.testMessages,
      testType: type, 
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

  //This method will allow you to update your rabbitAddress, exchanges, bindings, and message in the test environment, but will not overwrite your snapshot data. 

  updateRabbitStressTest(rabbitAddress, exchanges, bindings, message) {
    if (rabbitAddress) this.rabbitAddress = rabbitAddress;
    if (exchanges) {
      this.exchanges = {};
      exchanges.forEach((exc) => {
        this.exchanges[exc.name] = exc;
      });
    };
    if (bindings) this.bindings = bindings;
    this.readyToTest = false;
    this.testMessages = [];
    this.totalMessagesSent = 0;
    if (message) this.message = message;
  }

  //Use this method to update the target of messages to be sent.

  updateTarget(target) {
    if (target && typeof target === 'number') this.target = target;
  }
}

module.exports = RabbitStressTest;
