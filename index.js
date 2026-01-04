require("dotenv").config();
const express = require('express')
const cors = require('cors');
const app = express()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 3000;


const admin = require("firebase-admin");

admin.initializeApp({
    credential: admin.credential.cert({
        type: process.env.TYPE,
        project_id: process.env.PROJECT_ID,
        private_key_id: process.env.PRIVATE_KEY_ID,
        private_key: process.env.PRIVATE_KEY ? process.env.PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
        client_email: process.env.CLIENT_EMAIL,
        client_id: process.env.CLIENT_ID,
        auth_uri: process.env.AUTH_URI,
        token_uri: process.env.TOKEN_URI,
        auth_provider_x509_cert_url: process.env.AUTH_PROVIDER_X509_CERT_URL,
        client_x509_cert_url: process.env.CLIENT_X509_CERT_URL,
        universe_domain: process.env.UNIVERSE_DOMAIN
    }),
});

app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});



async function run() {
    try {
        // await client.connect();
        const database = client.db("socialEventsDb");
        const eventCollection = database.collection("events");
        const joinedEventsCollection = database.collection("joinedEvents")
        const userCollection = database.collection("users")

        console.log("Pinged your deployment. You successfully connected to MongoDB!");

       
        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email };
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'User already exists', insertedId: null });
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        });

       
        app.get('/users', async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        });

       
        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc);
            res.send(result);
        });

        
        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await userCollection.deleteOne(query);
            res.send(result);
        });


        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
           
            const query = { email: email };
            const user = await userCollection.findOne(query);

            let admin = false;
            if (user) {
                admin = user?.role === 'admin';
            }
            res.send({ admin });
        });


      
        app.post("/events", async (req, res) => {
            const eventdata = req.body;
            const result = await eventCollection.insertOne(eventdata);
            res.send(result);
        })

        
        app.get("/events", async (req, res) => {
            const { type, search } = req.query;
            let query = {};

            if (type) query.type = type;
            if (search) query.title = { $regex: search, $options: "i" };

            const result = await eventCollection.find(query).toArray();
            res.send(result);
        });

        
        app.get("/events/:id", async (req, res) => {
            const id = req.params.id;
            const result = await eventCollection.findOne({ _id: new ObjectId(id) });
            res.send(result);
        })

      
        app.get("/my-events/:email", async (req, res) => {
            const email = req.params.email;
            
            const result = await eventCollection.find({ email: email }).toArray();
            res.send(result);
        })

       
        app.delete("/events/:id", async (req, res) => {
            try {
                const id = req.params.id;
                const result = await eventCollection.deleteOne({ _id: new ObjectId(id) });
                res.send(result);
            }
            catch (error) {
                res.status(500).send({ message: "Failed to delete event" });
            }
        })

        
        app.put("/events/:id", async (req, res) => {
            try {
                const id = req.params.id;
                const updateEvent = req.body;
                const result = await eventCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: updateEvent }
                );
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Failed to update event" });
            }
        });


      
        app.post("/joined-events", async (req, res) => {
            const joinedData = req.body;

            const alreadyJoined = await joinedEventsCollection.findOne({
                eventId: joinedData.eventId,
                userEmail: joinedData.userEmail
            })
            if (alreadyJoined) {
                return res.status(409).send({ message: "Already joined" });
            }

            const result = await joinedEventsCollection.insertOne(joinedData);
            res.send(result);
        })

       
        app.get("/joined-events/:email", async (req, res) => {
            const email = req.params.email;
           
            const result = await joinedEventsCollection.find({ userEmail: email }).toArray();
            res.send(result);
        })

        
        app.delete("/joined-events/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await joinedEventsCollection.deleteOne(query);
            res.send(result);
        })

    } finally {
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Social Events Server is Running')
})

app.listen(port, () => {
    console.log(`Server is running on port ${port}`)
})