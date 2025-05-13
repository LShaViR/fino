import express from "express";
import db from "@repo/db/client";

const app = express();

app.post("/hdfcWebhook", async (req, res) => {
  //TODO; add zod validation here
  //TODO: add a validation whether this request comming from hdfc or not using webhook secret
  const paymentInformation = {
    token: req.body.token,
    userId: req.body.user_identifier, //TODO: change this to transaction id
    amount: req.body.amount,
  };
  try {
    await db.$transaction([
      //NOTE: we want this request to execute collectively no separate request should go out
      db.balance.update({
        where: {
          userId: paymentInformation.userId,
        },
        data: {
          amount: {
            increment: paymentInformation.amount,
          },
        },
      }),

      db.onRampTransaction.update({
        where: {
          token: paymentInformation.token,
        },
        data: {
          status: "Success",
        },
      }),
    ]);
    res.json({
      message: "captured",
    }); //Note: if this is not here or any bad status code is sent to hdfc it will guess server didn't process this request hence it will refund money
  } catch (e) {
    await db.onRampTransaction.update({
      where: {
        token: paymentInformation.token,
      },
      data: {
        status: "Failure",
      },
    });
    res.status(411).json({
      message: "Error while processing transaction",
    });
  }

  //TODO: update db balance
});
