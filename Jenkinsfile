pipeline {
    agent any
    
    

    stages {
        stage('1:cleaning') {
            steps {
                script {
                    sh 'rm -rf ./*'
                }
            }
        }
        stage('2:Git Cloning') {
            steps {
                git branch: 'main', url: 'https://github.com/sardinsavio-learnig/employee-management.git'
            }
        }
        
        
        stage('3: Docker Build Image') {
            steps {
                script {
                    withDockerRegistry(
                        credentialsId: 'docker-token',
                        toolName: 'Docker'
                    ) {
                        sh '''
                            echo "Current workspace:"
                            pwd

                            echo "Project files:"
                            ls -la

                            docker build -t alodemo/employee-manage:v1 -f frontend/Dockerfile frontend/
                        '''
                    }
                }
            }
        }

        stage('4: Docker Push') {
            steps {
                script {
                    withDockerRegistry(
                        credentialsId: 'docker-token',
                        toolName: 'Docker'
                    ) {
                        sh 'docker push alodemo/employee-manage:v1'
                    }
                }
            }
        }
    }
}
