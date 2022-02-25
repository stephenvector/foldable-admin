import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import {
  getFirestore,
  onSnapshot,
  collection,
  query,
  addDoc,
} from "firebase/firestore";
import type { User } from "firebase/auth";

enum AuthEventName {
  CheckedAuth = "checkedAuth",
  SignedOut = "signedOut",
  SignedIn = "signedIn",
}

function el(
  name: keyof HTMLElementTagNameMap,
  attributes?: Record<string, string>,
  children?: string
) {
  const element = document.createElement(name);

  if (attributes) {
    Object.entries(attributes).map(([k, v]) => {
      element.setAttribute(k, v);
    });
  }

  if (children) {
    element.innerText = children;
  }

  return element;
}

function observable<T>(initialValue: T) {
  let value: T = initialValue;
  const subscribers: ((v: T) => void)[] = [];

  function set(newValue: T) {
    value = newValue;

    subscribers.forEach((c) => c(value));
  }

  function get() {
    return value;
  }

  function subscribe(callback: (newValue: T) => void) {
    subscribers.push(callback);
    callback(value);
  }

  function unsubscribe(callback: (newValue: T) => void) {
    subscribers.splice(subscribers.indexOf(callback) >>> 0, 1);
  }

  return {
    set,
    get,
    subscribe,
    unsubscribe,
  };
}

function emitter() {
  const listeners = new Map<string, (() => void)[]>();

  function on(eventName: string, callback: () => void) {
    const listener = listeners.get(eventName);
    if (listener) {
      listener.push(callback);
    } else {
      listeners.set(eventName, [callback]);
    }
  }

  function emit(eventName: string) {
    const callbacks = listeners.get(eventName) ?? [];
    callbacks.forEach((p) => p());
  }

  return {
    on,
    emit,
  };
}

const authEmitter = emitter();

authEmitter.on(AuthEventName.SignedIn, () => {
  console.log("signed in");
});

const user = observable<User | null>(null);

function printUser(user: User | null) {
  console.log("user:");
  console.log(user);
}

user.subscribe(printUser);
user.set(null);
user.set(null);
user.unsubscribe(printUser);
console.log("no more");
user.set(null);
user.set(null);
user.set(null);
user.set(null);
user.set(null);

// -------------------------------------
// TYPES
// -------------------------------------
enum FirestoreCollection {
  BlogPosts = "posts",
}
type ReceiveBlogPostsEvent = {
  type: "ReceiveBlogPosts";
  payload: BlogPosts;
};

enum AppEvents {
  CheckedAuth = "checkedAuth",
  SignedIn = "signedIn",
  SignedOut = "signedOut",
  ReceiveBlogPosts = "receiveBlogPosts",
}

type BlogPost = {
  title: string;
  content: string;
};

type BlogPosts = Record<string, BlogPost>;

type State = {
  user: User | null;
  checkedAuth: boolean;
  posts: BlogPosts;
};

// -------------------------------------
// FIREBASE
// -------------------------------------
const googleProvider = new GoogleAuthProvider();
const firebaseConfig = {
  apiKey: "AIzaSyBBgFFZqgfGd9Gl5tYIQRam2jjj25IaFQg",
  authDomain: "foldable-cms.firebaseapp.com",
  projectId: "foldable-cms",
  storageBucket: "foldable-cms.appspot.com",
  messagingSenderId: "592875802166",
  appId: "1:592875802166:web:48a0651c2ff2a104a85297",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

// -------------------------------------
// APP
// -------------------------------------
const root = document.getElementById("root") as HTMLElement;

function empty(element: HTMLElement) {
  while (element.firstElementChild) {
    element.firstElementChild.remove();
  }
}

const loadingElement = el("div", {}, "loading");
root.appendChild(loadingElement);

const state: State = {
  checkedAuth: false,
  user: null,
  posts: {},
};

const signInButton = el("button", { type: "button" }, "Sign In With Google");
signInButton.addEventListener("click", (e) => {
  e.preventDefault();
  signInWithPopup(auth, googleProvider);
});

const signOutButton = el("button", { type: "button" }, "Sign Out");

signOutButton.addEventListener("click", (e) => {
  e.preventDefault();
  auth.signOut();
});

auth.onAuthStateChanged((user) => {
  state.user = user;
  state.checkedAuth = true;
  window.dispatchEvent(new CustomEvent(AppEvents.CheckedAuth));
  if (user) {
    authEmitter.emit(AuthEventName.SignedIn);
    window.dispatchEvent(new CustomEvent(AppEvents.SignedIn));
  } else {
    window.dispatchEvent(new CustomEvent(AppEvents.SignedOut));
  }
});

const appElement = document.createElement("div");
appElement.innerText = "App";

function label(text: string) {
  return el("label", {}, text);
}

function createPostForm(onSubmit: (values: BlogPost) => void) {
  const postFormElement = document.createElement("form");

  const titleElement = el("input", { type: "text", name: "title" });

  const contentElement = el("textarea", { name: "content" });

  const submitButton = el("button", { type: "submit" }, "Save");

  postFormElement.appendChild(label("Title"));
  postFormElement.appendChild(titleElement);
  postFormElement.appendChild(label("Content"));
  postFormElement.appendChild(contentElement);
  postFormElement.appendChild(submitButton);

  postFormElement.addEventListener("submit", (e) => {
    e.preventDefault();
    const formData = new FormData(postFormElement);
    onSubmit({
      title: formData.get("title")?.toString() || "",
      content: formData.get("content")?.toString() || "",
    });
    console.log(formData.get("title"), formData.get("content"));
  });

  return postFormElement;
}

window.addEventListener(AppEvents.CheckedAuth, () => {
  console.log("checked auth");
});

window.addEventListener(AppEvents.SignedOut, () => {
  empty(root);
  root.appendChild(signInButton);
});

window.addEventListener(AppEvents.SignedIn, () => {
  empty(root);
  root.appendChild(appElement);
  root.appendChild(signOutButton);
  root.appendChild(getPostsList());
  root.appendChild(
    createPostForm(({ title, content }) => {
      addDoc(collection(firestore, FirestoreCollection.BlogPosts), {
        title,
        content,
      });
    })
  );
});

function div() {
  return document.createElement("div");
}

function getPostsList() {
  const wrapper = div();

  window.addEventListener(AppEvents.ReceiveBlogPosts, (event) => {
    const blogPosts = event?.detail?.blogPosts || {};
    empty(wrapper);

    Object.entries(blogPosts).forEach(([id, { title }]) => {
      const postDiv = div();
      postDiv.innerText = title;
      wrapper.appendChild(postDiv);
    });
  });

  return wrapper;
}

window.addEventListener(AppEvents.SignedIn, () => {
  const unsubscribe = onSnapshot(
    query(collection(firestore, FirestoreCollection.BlogPosts)),
    (snapshot) => {
      const newBlogPosts: Record<string, BlogPost> = {};

      snapshot.forEach((doc) => {
        const { title, content } = doc.data() || { title: "", content: "" };
        newBlogPosts[doc.id] = { title, content };
      });

      console.log(newBlogPosts);

      window.dispatchEvent(
        new CustomEvent(AppEvents.ReceiveBlogPosts, {
          detail: { blogPosts: newBlogPosts },
        })
      );
    }
  );

  window.addEventListener(AppEvents.SignedOut, () => {
    unsubscribe();
  });
});
