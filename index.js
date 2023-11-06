const express = require('express')
const app = express()
require('dotenv').config()
const port = process.env.PORT || 5000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');


// middleware
app.use(express.json())
app.use(cors())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.4pbmvpd.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const booksCollection = client.db('LibraryDB').collection('BooksCollection')
const borrowedCollection = client.db('LibraryDB').collection('Borrowed')

async function run() {
    try {
        client.connect();
        //----------------------------------BORROW APIs-----------------------------------
        // Get borrowed books
        app.get('/api/v1/borrowed', async (req, res) => {
            const userEmail = req.query.email

            let filter = {}
            if (userEmail) {
                filter.email = userEmail
            }

            let result = await borrowedCollection.find(filter).toArray()
            res.send(result)
        })

        app.post('/api/v1/borrow-book', async (req, res) => {
            const data = req.body
            let result = await borrowedCollection.insertOne(data)
            res.send(result)
        })

        // update QTY
        app.patch('/api/v1/update-quantity', async (req, res) => {
            const operation = req.query.operation
            const data = req.body
            // console.log(operation, data);
            let obj = {}

            if (operation == 'decrease') { obj.qty = (data.qty - 1) }
            if (operation == 'increase') { obj.qty = (data.qty + 1) }

            let filter = { _id: new ObjectId(data.productID) }
            // let option = { upsert: false }
            let document = {
                $set: obj
            }
            const result = await booksCollection.updateOne(filter, document)
            res.send(result)
        })


        //--------------------------------------BOOKS APIs-----------------------------------------
        // Get All / Category filtered books
        app.get('/api/v1/all-books', async (req, res) => {
            const category = req?.query?.category
            const availibility = req?.query?.available

            let filter = {}
            // Get Category-wise books
            if (category) {
                filter.category = category
            }
            if (availibility) {
                filter.qty = { $gt: 0 }
            }

            let result = await booksCollection.find(filter).toArray()
            res.send(result)
        })

        // get Single bookbyID
        app.get('/api/v1/Abook/:id', async (req, res) => {
            const id = req.params.id
            let filter = {
                _id: new ObjectId(id)
            }
            const result = await booksCollection.findOne(filter)
            res.send(result)
        })

        // Add Book (admin only)
        app.post('/api/v1/addBook', async (req, res) => {
            const book = req.body
            let result = await booksCollection.insertOne(book)
            res.send(result)
        })

        //Update a book 
        app.put('/app/v1/update/:id', async (req, res) => {
            let id = req.params.id
            let data = req.body
            let filter = {
                _id: new ObjectId(id)
            }
            let newBook = {
                $set: {
                    name: data.name,
                    rating: data.rating,
                    qty: data.qty,
                    authorName: data.authorName,
                    img: data.img,
                    category: data.category
                }
            }
            let option = { upsert: true }
            let result = await booksCollection.updateOne(filter, newBook, option)
            res.send(result)
        })

        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})