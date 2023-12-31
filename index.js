const express = require('express')
const app = express()
require('dotenv').config()
const port = process.env.PORT || 5000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')



// middleware
app.use(express.json())
app.use(cors({
    origin: [
        // 'http://localhost:5173',
        'https://assignment-11-f750c.web.app'
    ],
    credentials: true
}))
app.use(cookieParser())


// custom middlewares:

const verify = (req, res, next) => {
    let token = req?.cookies?.AccessToken
    if (!token) { res.status(401).send({ message: "Unauthorized user" }) }

    jwt.verify(token, process.env.SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: "Unauthorized user" })
        }
        req.TokenUserEmail = decoded.email;
        next()
    })

}


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

        // --------------------------------------ACCESS TOKEN---------------------------------
        app.post('/api/v1/jwt', async (req, res) => {
            const loggedInUser = req.body
            const token = jwt.sign(loggedInUser, process.env.SECRET, { expiresIn: '10h' });

            // const options = {
            //     sameSite: 'none',
            //     secure: true,
            //     httpOnly: true,
            // }

            const options = {
                sameSite: 'none',
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            }

            res.cookie('AccessToken', token, options)
                .send({ success: true })
        })

        app.post('/api/v1/logout', async (req, res) => {
            const loggedInUser = req.body
            res.clearCookie('AccessToken', { maxAge: 0 })
                .send({ success: true })
        })



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

        // Boorrow a book
        app.post('/api/v1/borrow-book', async (req, res) => {
            const data = req.body


            // Search if the bookd is already borrowed
            let filter = { productID: data.productID }
            let isBorrowed = await borrowedCollection.findOne(filter)
            if (isBorrowed) {
                return res.send({ exists: true })
            }

            // If not borrowed, insert and send result.
            let result = await borrowedCollection.insertOne(data)
            res.send(result)
        })

        // update QTY Borrow$Return
        app.patch('/api/v1/update-quantity', async (req, res) => {
            const operation = req.query.operation
            const data = req.body
            let quantity = data.qty
            if (operation === 'decrease') { quantity -= 1 }
            if (operation === 'increase') { quantity += 1 }
            let obj = {}
            obj.qty = quantity
            let filter = { _id: new ObjectId(data.productID) }
            let document = {
                $set: obj
            }
            const result = await booksCollection.updateOne(filter, document)
            res.send(result)
        })

        app.delete('/api/v1/return-borrowed/:id', async (req, res) => {
            const id = req.params.id
            let filter = {
                _id: new ObjectId(id)
            }
            let result = await borrowedCollection.deleteOne(filter)
            res.send(result)
        })

        //--------------------------------------BOOKS APIs-----------------------------------------
        app.get('/api/v1/all-books-verified', verify, async (req, res) => {
            const currentUser = req?.query?.email
            const tokenUser = req?.TokenUserEmail
            if (currentUser !== tokenUser) { return res.status(401).send({ message: "Forbidden Access" }) }
            let result = await booksCollection.find().toArray()
            res.send(result)
        })

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
        app.post('/api/v1/addBook', verify, async (req, res) => {
            const book = req.body
            const currentUser = req?.query?.email
            const tokenUser = req?.TokenUserEmail

            if (currentUser !== tokenUser) { return res.status(200).send({ message: "Forbidden Access" }) }

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