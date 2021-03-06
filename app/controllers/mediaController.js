const express = require("express");
const router = express.Router();
const User = require("../models/user");
const File = require("../models/file");
const Share = require("../models/share");
const fs = require("fs");
const uuid = require("uuid");
const { getPath, getIp } = require("../utils/userPath");

module.exports = (media) => {
  //
  // #fix# generate link to download file
  //
  router.route("/:fileId").get(async (req, res, next) => {
    try {
      const addressIp = getIp(req);
      const { fileId } = req.params;
      const userId = req.userId;
      const userPath = await User.findOne({ _id: userId }).then((data) => {
        return data.rootFolder;
      });
      const userStorage = getPath(userPath, "/storage");
      File.findOne({ id: fileId, userId: userId })
        .then((data) => {
          console.log(data);
          let generateLink = new Share({
            addressIp: addressIp,
            linkId: uuid.v4(),
            filePath: userStorage + data.path + data.name,
            createdAt: Date.now(),
            expireAt: Date.now() + 40000000,
          });
          generateLink.save().then(() => {
            res.json({ link: generateLink.linkId });
          });
        })
        .catch((err) => next(err));
    } catch (error) {
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      next(error);
    }
  });
  //
  // upload file
  //
  router.route("/").post(media.single("file"), (req, res, next) => {
    try {
      const { userPath } = req.body;
      const userId = req.userId;
      User.findOne({ _id: userId }).then((data) => {
        let userStorage = getPath(data.rootFolder, "/storage");
        let filePath = userStorage + userPath + req.file.originalname;
        fs.writeFileSync(
          filePath,
          Buffer.from(new Uint8Array(req.file.buffer))
        );
        const file = new File({
          name: req.file.originalname,
          id: uuid.v4(),
          path: userPath,
          createdAt: Date.now(),
          userId: userId,
          trash: false,
          type: "file",
        });
        file.save().then(() => {
          res.status(200).json({ file: file });
        });
      });
    } catch (error) {
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      next(error);
    }
  });

  return router;
};
