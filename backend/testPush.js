fetch("https://exp.host/--/api/v2/push/send", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    to: "ExponentPushToken[XXXXXX]", // remplace par ton token réel
    title: "Test",
    body: "Hello 🚀",
  }),
})
  .then(res => res.json())
  .then(data => console.log("RESULT:", data))
  .catch(err => console.log("ERROR:", err));