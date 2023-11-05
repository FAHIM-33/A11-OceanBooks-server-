const express = require('express')
const app = express()
require('dotenv').config()
const port = process.env.PORT || 5000
const { MongoClient, ServerApiVersion } = require('mongodb');

// middleware
app.use(express.json())


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

        // Get All or filtered books
        app.get('/api/v1/all-books', async (req, res) => {
            const category = req.query.category
            let filter = {}


            // Get Category-wise books
            if (category) {
                filter.category = category
            }

            let result = await booksCollection.find(filter).toArray()
            res.send(result)
        })


        // Add Book (admin only)


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