"use strict";
const { authorize } = require("./deployment-authorization.cjs");

// Historical filename retained for immutable workflow references; no approval history.
module.exports = (args) => authorize({ ...args, profile: "avm" });
