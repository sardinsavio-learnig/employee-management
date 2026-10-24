pipeline {
    agent any

    environment {
        IMAGE_TAG = "v${BUILD_NUMBER}"
        FRONTEND_IMAGE = 'alodemo/employee-manage'
        BACKEND_IMAGE = 'alodemo/employee-manage-backend'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build images') {
            steps {
                sh '''
                    docker build \
                        --tag ${FRONTEND_IMAGE}:${IMAGE_TAG} \
                        --tag ${FRONTEND_IMAGE}:latest \
                        --file frontend/Dockerfile frontend

                    docker build \
                        --tag ${BACKEND_IMAGE}:${IMAGE_TAG} \
                        --tag ${BACKEND_IMAGE}:latest \
                        --file backend/Dockerfile backend
                '''
            }
        }

        stage('Push images') {
            steps {
                withDockerRegistry(
                    credentialsId: 'docker-token',
                    url: 'https://index.docker.io/v1/'
                ) {
                    sh '''
                        docker push ${FRONTEND_IMAGE}:${IMAGE_TAG}
                        docker push ${FRONTEND_IMAGE}:latest
                        docker push ${BACKEND_IMAGE}:${IMAGE_TAG}
                        docker push ${BACKEND_IMAGE}:latest
                    '''
                }
            }
        }
    }
}
