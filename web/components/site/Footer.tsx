import { Divider, Link as HLink } from "@heroui/react";
import { Github, Twitter, Linkedin, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-foreground/10 bg-foreground/[0.02]">
      <div className="mx-auto max-w-6xl px-4 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-1">
            <h3 className="font-bold text-primary text-lg mb-3">OriginX</h3>
            <p className="text-sm text-foreground/70 leading-relaxed">
              AI-powered anti-counterfeit platform for Bangladesh SMEs.
            </p>
            <div className="flex items-center gap-3 mt-4">
              <HLink href="#" className="text-foreground/60 hover:text-primary transition-colors">
                <Github className="h-5 w-5" />
              </HLink>
              <HLink href="#" className="text-foreground/60 hover:text-primary transition-colors">
                <Twitter className="h-5 w-5" />
              </HLink>
              <HLink href="#" className="text-foreground/60 hover:text-primary transition-colors">
                <Linkedin className="h-5 w-5" />
              </HLink>
              <HLink href="#" className="text-foreground/60 hover:text-primary transition-colors">
                <Mail className="h-5 w-5" />
              </HLink>
            </div>
          </div>

          {/* Product Column */}
          <div>
            <h4 className="font-semibold text-foreground mb-3 text-sm">Product</h4>
            <nav className="flex flex-col gap-2">
              <HLink href="#features" className="text-sm text-foreground/70 hover:text-primary transition-colors">Features</HLink>
              <HLink href="#roles" className="text-sm text-foreground/70 hover:text-primary transition-colors">Roles</HLink>
              <HLink href="#modules" className="text-sm text-foreground/70 hover:text-primary transition-colors">Modules</HLink>
              <HLink href="#pricing" className="text-sm text-foreground/70 hover:text-primary transition-colors">Pricing</HLink>
            </nav>
          </div>

          {/* Company Column */}
          <div>
            <h4 className="font-semibold text-foreground mb-3 text-sm">Company</h4>
            <nav className="flex flex-col gap-2">
              <HLink href="#" className="text-sm text-foreground/70 hover:text-primary transition-colors">About</HLink>
              <HLink href="#" className="text-sm text-foreground/70 hover:text-primary transition-colors">Blog</HLink>
              <HLink href="#" className="text-sm text-foreground/70 hover:text-primary transition-colors">Careers</HLink>
              <HLink href="#" className="text-sm text-foreground/70 hover:text-primary transition-colors">Contact</HLink>
            </nav>
          </div>

          {/* Legal Column */}
          <div>
            <h4 className="font-semibold text-foreground mb-3 text-sm">Legal</h4>
            <nav className="flex flex-col gap-2">
              <HLink href="#" className="text-sm text-foreground/70 hover:text-primary transition-colors">Privacy</HLink>
              <HLink href="#" className="text-sm text-foreground/70 hover:text-primary transition-colors">Terms</HLink>
              <HLink href="#" className="text-sm text-foreground/70 hover:text-primary transition-colors">Security</HLink>
              <HLink href="#" className="text-sm text-foreground/70 hover:text-primary transition-colors">Compliance</HLink>
            </nav>
          </div>
        </div>

        <Divider className="mb-6" />

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-foreground/60">
          <p>© {new Date().getFullYear()} OriginX. All rights reserved.</p>
          <p>Made with 💙 for Bangladesh manufacturers</p>
        </div>
      </div>
    </footer>
  );
}


