import { Switch, Route } from "wouter";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import UploadsPage from "@/pages/uploads-page";
import ModerationPage from "@/pages/moderation-page";
import AdminPage from "@/pages/admin-page";
import VerifyPage from "@/pages/verify-page";
import ProfilePage from "@/pages/profile-page";
import UserProfilePage from "@/pages/user-profile-page";
import AlbumsPage from "@/pages/albums-page";
import AlbumPage from "@/pages/album-page";
import CreateAlbumPage from "@/pages/create-album-page";
import EditAlbumPage from "@/pages/edit-album-page";
import { ProtectedRoute } from "@/lib/protected-route";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/verify/:token" component={VerifyPage} />
      <ProtectedRoute path="/uploads" component={UploadsPage} />
      <ProtectedRoute path="/moderation" component={ModerationPage} />
      <ProtectedRoute path="/admin" component={AdminPage} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <ProtectedRoute path="/profile/:id" component={UserProfilePage} />
      <ProtectedRoute path="/albums" component={AlbumsPage} />
      <ProtectedRoute path="/albums/new" component={CreateAlbumPage} />
      <ProtectedRoute path="/albums/:id/edit" component={EditAlbumPage} />
      <ProtectedRoute path="/albums/:id" component={AlbumPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        <Router />
      </main>
      <Footer />
    </div>
  );
}

export default App;
