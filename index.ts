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

enum FirestoreCollection {
  BlogPosts = "posts",
}

const googleProvider = new GoogleAuthProvider();

const root = document.getElementById("root") as HTMLElement;

function empty(element: HTMLElement) {
  while (element.firstElementChild) {
    element.firstElementChild.remove();
  }
}

const loadingElement = document.createElement("div");
loadingElement.innerText = "loading";
root.appendChild(loadingElement);

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

type BlogPostsEvents = {};

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

const state: State = {
  checkedAuth: false,
  user: null,
  posts: {},
};

const signInButton = document.createElement("button");
signInButton.setAttribute("type", "button");
signInButton.innerText = "Sign In With Google";
signInButton.addEventListener("click", (e) => {
  e.preventDefault();
  signInWithPopup(auth, googleProvider);
});

const signOutButton = document.createElement("button");
signOutButton.setAttribute("type", "button");
signOutButton.innerText = "Sign Out";
signOutButton.addEventListener("click", (e) => {
  e.preventDefault();
  auth.signOut();
});

auth.onAuthStateChanged((user) => {
  state.user = user;
  state.checkedAuth = true;
  window.dispatchEvent(new CustomEvent(AppEvents.CheckedAuth));
  if (user) {
    window.dispatchEvent(new CustomEvent(AppEvents.SignedIn));
  } else {
    window.dispatchEvent(new CustomEvent(AppEvents.SignedOut));
  }
});

const appElement = document.createElement("div");
appElement.innerText = "App";

function label(text: string) {
  const l = document.createElement("label");
  l.innerText = text;
  return l;
}

function createPostForm(onSubmit: (values: BlogPost) => void) {
  const postFormElement = document.createElement("form");

  const titleElement = document.createElement("input");
  titleElement.setAttribute("type", "text");
  titleElement.setAttribute("name", "title");

  const contentElement = document.createElement("textarea");
  contentElement.setAttribute("name", "content");

  const submitButton = document.createElement("button");
  submitButton.innerText = "Save";
  submitButton.setAttribute("type", "submit");

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
