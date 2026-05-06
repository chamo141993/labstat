# Week 6 Progress Report: 5G Lab Monitor (labstat)

## What I Did
This week I focused on implementing the backend portion of 'labstat', the 5G lab telemetry dashboard. 

-Edge Agent Development: I developed a Python edge agent for the lab's RAN/RIC laptop. To avoid unnecessary privilege escalation, I added my user to the Docker group rather than running the entire monitoring script as root. The agent queries `systemctl` and `docker ps` locally, constructs a JSON payload, and pushes it outbound.

-Cloud Backend & Container Security: Built the Node.js/Express backend API which is ready but yet to be deployed on Render. To demonstrate secure container practices, I utilized a multi-stage `Dockerfile` that compiles the app and runs it on a Google Distroless image (removing the shell and package managers from the production environment).

-Version Control Security: I established version control for the project on GitHub. Instead of using standard broad-access credentials, I generated a Fine-Grained Personal Access Token (PAT) strictly scoped with read/write permissions for just this specific repository to push the code. Github repo = https://github.com/chamo141993/labstat

## Why I Did It That Way
Every technical decision this week was driven by the Principle of Least Privilege (POLP). By ensuring the Python script doesn't run as root, utilizing a Distroless container for the cloud backend, and restricting GitHub push access via a fine-grained PAT, I am minimizing the blast radius if any single component is compromised. 

## How it Ties to the Learning Objectives

-Describe what can be done to verify that a potential new employee has the desired character traits and skills, as well as the difficulties of getting that information: Building secure architectures like this multi-stage Distroless deployment requires specific practical knowledge. To verify these skills in new hires, organizations can use hands-on technical assessments or probation periods. However, the difficulty lies in the time and resources required to accurately grade practical labs, whereas verifying character traits (like a genuine commitment to security best practices rather than cutting corners) is notoriously difficult to discern from an interview alone.

-Describe some approaches that can make security awareness training more effective: Training is often most effective when it is highly contextualized and practical. For instance, rather than a slide deck on password security, having personnel walk through the exact process of generating and troubleshooting a Fine-Grained PAT (like the Git 403 permission errors I encountered this week) provides memorable, hands-on experience with the Principle of Least Privilege.

-Describe the problems that large organizations need to solve if they want to disable all computer accounts for terminating employees in a timely fashion: In this project alone, identity and access span local Ubuntu accounts, Render API keys, and GitHub tokens. For a large organization, this identity sprawl is a massive problem. Timely termination requires centralized Identity and Access Management (IAM) systems or Single Sign-On (SSO) so that revoking one central profile instantly cascades across all decoupled cloud services and edge infrastructure.

