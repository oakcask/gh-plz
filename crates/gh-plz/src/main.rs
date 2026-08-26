use std::io::{self, Write};

use clap::{Parser, Subcommand};

#[derive(Debug, Parser)]
#[command(
    name = "gh-plz",
    bin_name = "gh plz",
    about = "A GitHub CLI extension",
    arg_required_else_help = true,
    disable_help_subcommand = true
)]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Debug, Subcommand)]
enum Command {
    /// Print version
    Version,
}

fn main() -> io::Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Command::Version => write_version(io::stdout().lock()),
    }
}

fn write_version(mut writer: impl Write) -> io::Result<()> {
    writeln!(writer, env!("CARGO_PKG_VERSION"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_version_subcommand() {
        let cli = Cli::try_parse_from(["gh-plz", "version"]).unwrap();

        assert!(matches!(cli.command, Command::Version));
    }

    #[test]
    fn version_subcommand_prints_package_version() {
        let mut output = Vec::new();

        write_version(&mut output).unwrap();

        let output = String::from_utf8(output).unwrap();
        assert_eq!(output, format!("{}\n", env!("CARGO_PKG_VERSION")));
    }
}
