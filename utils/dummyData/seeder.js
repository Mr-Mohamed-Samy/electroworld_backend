const Fs = require('fs')
require('colors')
const dotenv = require('dotenv')
const Product = require('../../module/productSchema')
const dbconnection = require('../../config/dbcon')

dotenv.config({path: '../../config.env'})
console.log('MongoDB URI:', process.env.URL_DB);

dbconnection()

const products = JSON.parse(Fs.readFileSync('./products.json'))

const insertData = async ()=>{
    try {
        await Product.create(products)
        console.log('Data Inserted'.green.inverse)
        process.exit()
    }catch(error){
        console.log(error)
    }
}
const destroyData = async () => {
    try {
      await Product.deleteMany();
      console.log('Data Destroyed'.red.inverse);
      process.exit();
    } catch (error) {
      console.log(error);
    }
  }

// node seeder.js -d
if (process.argv[2] === '-i') {
    insertData();
  } else if (process.argv[2] === '-d') {
    destroyData();
  }