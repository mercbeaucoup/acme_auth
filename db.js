const Sequelize = require("sequelize");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { STRING } = Sequelize;
const config = {
  logging: false,
};
const SECRET_KEY = process.env.JWT;

if (process.env.LOGGING) {
  delete config.logging;
}
const conn = new Sequelize(
  process.env.DATABASE_URL || "postgres://localhost/acme_db",
  config
);

const User = conn.define("user", {
  username: STRING,
  password: STRING,
});

const Note = conn.define("note", {
  text: STRING,
});

User.byToken = async (token) => {
  try {
    const verifyToken = jwt.verify(token, SECRET_KEY);
    const user = await User.findByPk(verifyToken.id);
    if (user) {
      return user;
    }

    const error = Error("bad credentials");
    error.status = 401;
    throw error;
  } catch (ex) {
    const error = Error("bad credentials");
    error.status = 401;
    throw error;
  }
};

User.authenticate = async ({ username, password }) => {
  const user = await User.findOne({
    where: {
      username,
    },
  });
  if (user && bcrypt.compare(password, user.password)) {
    // if (bcrypt.compare(password, user.password)) {
    return jwt.sign({ id: user.id }, SECRET_KEY);
    // }
  }
  const error = Error("bad credentials");
  error.status = 401;
  throw error;
};

User.beforeCreate(async (user) => {
  let hashed = await bcrypt.hash(user.password, 5);
  user.password = hashed;
});

const syncAndSeed = async () => {
  await conn.sync({ force: true });
  const credentials = [
    { username: "lucy", password: "lucy_pw" },
    { username: "moe", password: "moe_pw" },
    { username: "larry", password: "larry_pw" },
  ];
  const [lucy, moe, larry] = await Promise.all(
    credentials.map((credential) => User.create(credential))
  );
  const notes = [
    { text: "This workshop is hard." },
    { text: "Is it Friday yet?" },
    { text: "It's Sarah's birthday!" },
    { text: "Make a different note." },
    { text: "Working on a big screen is great." },
  ];
  const [one, two, three, four] = await Promise.all(
    notes.map((note) => Note.create(note))
  );
  await lucy.setNotes(one);
  await moe.setNotes([two, three]);
  await larry.setNotes(four);
  return {
    users: {
      lucy,
      moe,
      larry,
    },
    notes: {
      one,
      two,
      three,
      four,
    },
  };
};

Note.belongsTo(User);
User.hasMany(Note);

module.exports = {
  syncAndSeed,
  models: {
    User,
  },
};
