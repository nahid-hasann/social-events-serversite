require("dotenv").config();
const express = require('express')
const cors = require('cors');
const app = express()
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 3000;

const admin = require("firebase-admin");

const serviceAccount = require("./firebaseverifytoken.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
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

app.get('/', (req, res) => {
    res.send('Hello World!')
})


const verifyFireBaseToken = async (req, res, next) => {

    // console.log('inside the middleware', req.headers)

    const authorization = req.headers.authorization;

    if (!authrization) {
        return res.status(401).send({ message: 'unauthorization access' });
    }
    const token = authrization.split(" ")[1];
    if (!token) {
        return res.status(401).send({ message: 'unauthorization access' });
    }

    try {
        const decoded = await admin.auth().verifyIdToken(token);
        req.user = decoded;
        next();
    }
    catch {
        return res.status(401).send({ message: 'unauthorization access' });
    }

}



async function run() {
    try {
        console.log("MONGODB_URI loaded:", !!process.env.MONGODB_URI);
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        const database = client.db("socialEventsDb");
        const eventCollection = database.collection("events");
        const joinedEventsCollection = database.collection("joinedEvents")

        app.post("/events", verifyFireBaseToken, async (req, res) => {
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
            const ObjectId = require("mongodb").ObjectId;
            const result = await eventCollection.findOne({ _id: new ObjectId(id) });
            res.send(result);
        })

        app.post("/joined-events", verifyFireBaseToken, async (req, res) => {
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
        app.get("/joined-events/:email", verifyFireBaseToken, async (req, res) => {
            const email = req.params.email;
            if(req.user.email !== email){
                return res.status(403).send({ message: "Forbidden Access" });
            }
            const result = await joinedEventsCollection.find({ userEmail: email }).toArray();
            res.send(result);
        })

        app.get("/my-events/:email", verifyFireBaseToken, async (req, res) => {
            const email = req.params.email;
            const result = await eventCollection.find({ email }).toArray();
            res.send(result);
        })

        app.delete("/events/:id", verifyFireBaseToken async (req, res) => {

            try {
                const id = req.params.id;
                const ObjectId = require("mongodb").ObjectId;
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
                const ObjectId = require("mongodb").ObjectId;
                const result = await eventCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: updateEvent }
                );
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Failed to update event" });
            }
        });



        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})